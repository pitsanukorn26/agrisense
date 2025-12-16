# AgriSense Frontend/Backend Notes

## Azure Blob Storage (avatar uploads)
- `AZURE_STORAGE_ACCOUNT` – Azure Storage account name
- `AZURE_STORAGE_CONTAINER` – container name (e.g. `avatars`)
- `AZURE_STORAGE_SAS` – SAS token (include the leading `?sv=...`)
- `PUBLIC_ASSET_BASE` – e.g. `https://<account>.blob.core.windows.net/avatars`

ถ้าตั้งค่านี้ครบ การอัปโหลดจะใช้ Azure Blob และคืน URL เป็น `PUBLIC_ASSET_BASE/<key><SAS>` โดย container ไม่ต้องเป็น public

## S3/R2 fallback (ถ้าต้องการ)
- `S3_ENDPOINT` (เช่น R2 endpoint)
- `S3_REGION`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `PUBLIC_ASSET_BASE` (เช่น `https://<cdn-or-bucket-base>`)

ระบบจะเลือก Azure ก่อน ถ้าไม่ตั้งค่า Azure จะ fallback ไป S3/R2 เมื่อมี env ครบ
