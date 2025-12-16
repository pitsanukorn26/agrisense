import { ContainerClient } from "@azure/storage-blob"

const { AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_SAS, AZURE_STORAGE_CONTAINER } = process.env

const normalizedSas =
  AZURE_STORAGE_SAS && AZURE_STORAGE_SAS.startsWith("?")
    ? AZURE_STORAGE_SAS
    : AZURE_STORAGE_SAS
      ? `?${AZURE_STORAGE_SAS}`
      : undefined

export const azureBlobConfig = {
  enabled: Boolean(AZURE_STORAGE_ACCOUNT && normalizedSas && AZURE_STORAGE_CONTAINER),
  account: AZURE_STORAGE_ACCOUNT,
  container: AZURE_STORAGE_CONTAINER,
  sas: normalizedSas,
}

export function getAzureContainerClient(): ContainerClient {
  if (!azureBlobConfig.enabled || !azureBlobConfig.account || !azureBlobConfig.container || !azureBlobConfig.sas) {
    throw new Error("Azure Blob Storage is not configured")
  }

  const url = `https://${azureBlobConfig.account}.blob.core.windows.net/${azureBlobConfig.container}${azureBlobConfig.sas}`
  return new ContainerClient(url)
}
