Rice Leaf Disease API

FastAPI service for rice leaf disease classification using an EfficientNet-B3
checkpoint, with optional Grad-CAM output and an Azure Custom Vision-compatible
endpoint.

Run locally
- Install deps: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --reload --port 8000`

Environment
- `MODEL_PATH` (default: `models/best.pt`)
- `DEVICE` (default: `cpu`; set to `cuda` to use GPU if available)

Endpoints
- `GET /health` -> service status
- `GET /meta` -> classes, input size, Grad-CAM layer name

Inference
- `POST /predict`
  - multipart: `file` field
  - raw bytes: `Content-Type: application/octet-stream`
  - JSON: `{ "image": "data:image/jpeg;base64,..." }`
  - optional query: `gradcam=true` to include heatmap/overlay data URLs

Azure-compatible inference
- `POST /customvision/v3.0/Prediction/{project_id}/classify/iterations/{iteration}/image`
  - accepts raw bytes (`application/octet-stream`)
  - optional query: `gradcam=true`

Response fields (subset)
- `predictions`: list of `{ probability, tagName, tagId }`
- `pred_class`, `confidence`, `topk`
- `gradcam` (when requested): `{ heatmap, overlay, class_index, class_name, target_layer }`
