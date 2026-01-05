import base64
import os
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Dict, Any, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from PIL import ImageOps
from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from torchvision import transforms
from torchvision.models import efficientnet_b3

app = FastAPI(title="Rice Leaf Disease API", version="1.0")

MODEL_PATH = os.getenv("MODEL_PATH", "models/best.pt")
DEVICE = os.getenv("DEVICE", "cpu")  # แนะนำ server ใช้ cpu ก่อน
DEVICE = "cuda" if (DEVICE == "cuda" and torch.cuda.is_available()) else "cpu"

model: nn.Module = None
class_names = None
img_size = None
eval_tf = None
display_tf = None
target_layer = None
target_layer_name = None

def _strip_module_prefix(state_dict: Dict[str, Any]) -> Dict[str, Any]:
    if not any(k.startswith("module.") for k in state_dict):
        return state_dict
    return {k.replace("module.", "", 1): v for k, v in state_dict.items()}

def _find_last_conv_layer(m: nn.Module) -> Tuple[str, nn.Module]:
    last_name = None
    last_layer = None
    for name, layer in m.named_modules():
        if isinstance(layer, nn.Conv2d):
            last_name = name
            last_layer = layer
    if last_layer is None:
        raise RuntimeError("Grad-CAM target layer not found")
    return last_name, last_layer

def build_model(num_classes: int) -> nn.Module:
    m = efficientnet_b3(weights=None)
    m.classifier[1] = nn.Linear(m.classifier[1].in_features, num_classes)
    return m

def load_checkpoint():
    global model, class_names, img_size, eval_tf, display_tf, target_layer, target_layer_name

    ckpt = torch.load(MODEL_PATH, map_location=DEVICE)  # ใช้ได้ถ้าไฟล์มาจากคุณเอง (trusted)
    class_names = ckpt["class_names"]
    img_size = int(ckpt.get("img_size", 300))

    model = build_model(len(class_names)).to(DEVICE)
    model.load_state_dict(_strip_module_prefix(ckpt["state_dict"]))
    model.eval()

    resize_crop_tf = transforms.Compose([
        transforms.Resize(int(img_size * 1.15)),
        transforms.CenterCrop(img_size),
    ])

    eval_tf = transforms.Compose([
        resize_crop_tf,
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])
    display_tf = resize_crop_tf
    target_layer_name, target_layer = _find_last_conv_layer(model)

def _data_url_to_bytes(data_url: str) -> bytes:
    if not data_url.startswith("data:"):
        raise ValueError("Expected data URL")
    comma_idx = data_url.find(",")
    if comma_idx == -1:
        raise ValueError("Invalid data URL")
    b64 = data_url[comma_idx + 1 :]
    return base64.b64decode(b64)

async def _read_image_bytes(request: Request, file: Optional[UploadFile]) -> bytes:
    if file is not None:
        file_bytes = await file.read()
        if file_bytes:
            return file_bytes

    content_type = request.headers.get("content-type", "")
    if "application/octet-stream" in content_type:
        raw = await request.body()
        if raw:
            return raw
    if "application/json" in content_type:
        try:
            payload = await request.json()
        except Exception:
            payload = None
        if isinstance(payload, dict):
            image_data = payload.get("image")
            if isinstance(image_data, str) and image_data:
                try:
                    return _data_url_to_bytes(image_data)
                except Exception as exc:
                    raise HTTPException(status_code=400, detail="Invalid image data") from exc
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    if content_type:
        raise HTTPException(status_code=400, detail="Invalid payload")
    raw = await request.body()
    if raw:
        return raw

    raise HTTPException(status_code=400, detail="Invalid payload")

def _decode_image(data: bytes) -> Image.Image:
    try:
        img = Image.open(BytesIO(data))
        return ImageOps.exif_transpose(img).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image data") from exc

def _predictions_payload(
    probs: torch.Tensor,
) -> Tuple[list[Dict[str, Any]], list[Dict[str, Any]]]:
    probs_list = probs.detach().cpu().tolist()
    predictions = [
        {
            "probability": float(prob),
            "tagName": str(class_names[idx]),
            "tagId": str(idx),
        }
        for idx, prob in enumerate(probs_list)
    ]
    predictions.sort(key=lambda item: item["probability"], reverse=True)

    topk = min(3, len(class_names))
    top_probs, top_idxs = torch.topk(probs, k=topk)
    topk_payload = [
        {"class": class_names[int(i)], "prob": float(p)}
        for p, i in zip(top_probs.cpu(), top_idxs.cpu())
    ]
    return predictions, topk_payload

class _GradCAM:
    def __init__(self, layer: nn.Module):
        self.layer = layer
        self.activations = None
        self.gradients = None
        self._fwd_handle = layer.register_forward_hook(self._save_activation)
        self._bwd_handle = layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, inputs, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        if grad_output:
            self.gradients = grad_output[0].detach()

    def remove(self):
        self._fwd_handle.remove()
        self._bwd_handle.remove()

    def compute(self, target_size: Tuple[int, int]) -> torch.Tensor:
        if self.activations is None or self.gradients is None:
            raise RuntimeError("Grad-CAM missing activations/gradients")
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam = torch.relu(cam)
        cam = F.interpolate(cam, size=target_size, mode="bilinear", align_corners=False)
        cam = cam[0, 0]
        cam -= cam.min()
        cam /= cam.max() + 1e-8
        return cam

def _cam_to_data_url(cam: torch.Tensor, base_img: Image.Image) -> Tuple[str, str]:
    cam_np = (cam.detach().cpu().numpy() * 255).astype(np.uint8)
    heatmap = Image.fromarray(cam_np, mode="L")
    heatmap = ImageOps.colorize(heatmap, black="#0000ff", white="#ff0000")
    heatmap = heatmap.resize(base_img.size, resample=Image.BILINEAR)

    overlay = Image.blend(base_img.convert("RGB"), heatmap.convert("RGB"), alpha=0.45)

    def _to_data_url(img: Image.Image) -> str:
        buf = BytesIO()
        img.save(buf, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

    return _to_data_url(heatmap), _to_data_url(overlay)

def _ensure_ready():
    if model is None or eval_tf is None or class_names is None or display_tf is None:
        load_checkpoint()

@app.on_event("startup")
def _startup():
    load_checkpoint()

@app.get("/health")
def health():
    return {"ok": True, "device": DEVICE, "model_path": MODEL_PATH}

@app.get("/meta")
def meta():
    return {
        "classes": class_names,
        "img_size": img_size,
        "gradcam_layer": target_layer_name,
    }

@app.post("/predict")
async def predict(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    gradcam: bool = False,
) -> Dict[str, Any]:
    return await _predict_handler(request, file, gradcam=gradcam)

@app.post("/customvision/v3.0/Prediction/{project_id}/classify/iterations/{iteration}/image")
async def predict_customvision(
    project_id: str,
    iteration: str,
    request: Request,
    gradcam: bool = False,
) -> Dict[str, Any]:
    return await _predict_handler(
        request,
        file=None,
        gradcam=gradcam,
        project_id=project_id,
        iteration=iteration,
    )

async def _predict_handler(
    request: Request,
    file: Optional[UploadFile],
    gradcam: bool = False,
    project_id: str = "riceleaf-local",
    iteration: str = "best",
) -> Dict[str, Any]:
    _ensure_ready()
    img_bytes = await _read_image_bytes(request, file)
    img = _decode_image(img_bytes)

    x = eval_tf(img).unsqueeze(0).to(DEVICE)
    display_img = display_tf(img)

    if gradcam:
        if target_layer is None:
            raise HTTPException(status_code=500, detail="Grad-CAM is not configured")
        with torch.enable_grad():
            cam_ctx = _GradCAM(target_layer)
            try:
                logits = model(x)
                probs = torch.softmax(logits, dim=1).squeeze(0)
                conf, pred_idx = torch.max(probs, dim=0)
                pred_idx_value = int(pred_idx.item())
                conf_value = float(conf.item())
                model.zero_grad(set_to_none=True)
                score = logits[:, pred_idx_value].sum()
                score.backward()
                cam = cam_ctx.compute((x.shape[-2], x.shape[-1]))
            finally:
                cam_ctx.remove()
            heatmap_url, overlay_url = _cam_to_data_url(cam, display_img)
    else:
        with torch.no_grad():
            logits = model(x)
            probs = torch.softmax(logits, dim=1).squeeze(0)
            conf, pred_idx = torch.max(probs, dim=0)
            pred_idx_value = int(pred_idx.item())
            conf_value = float(conf.item())
        heatmap_url = None
        overlay_url = None

    predictions, topk_payload = _predictions_payload(probs)

    response: Dict[str, Any] = {
        "id": f"local-{uuid.uuid4()}",
        "project": project_id,
        "iteration": iteration,
        "created": datetime.now(timezone.utc).isoformat(),
        "predictions": predictions,
        "pred_class": class_names[pred_idx_value],
        "confidence": conf_value,
        "topk": topk_payload,
    }

    if gradcam:
        response["gradcam"] = {
            "heatmap": heatmap_url,
            "overlay": overlay_url,
            "class_index": pred_idx_value,
            "class_name": class_names[pred_idx_value],
            "target_layer": target_layer_name,
        }

    return response
