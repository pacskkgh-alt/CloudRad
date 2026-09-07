import logging
import requests
from fastapi import APIRouter, Request, Depends, HTTPException, Response
from sqlalchemy.orm import Session
import models, database, auth
from api_config import ORTHANC_URL, ORTHANC_USER, ORTHANC_PASSWORD

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dicom-web", tags=["DICOMweb Proxy"])

def get_orthanc_auth():
    return requests.auth.HTTPBasicAuth(ORTHANC_USER, ORTHANC_PASSWORD)

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
async def dicomweb_proxy(
    path: str,
    request: Request,
    db: Session = Depends(database.get_db),
    # Optional auth for view-only (WADO-RS), strictly required for POSTs (STOW-RS)
):
    """
    Reverse proxy between the frontend DICOMweb requests and the protected Orthanc DICOMweb API.
    """
    orthanc_target_url = f"{ORTHANC_URL}/dicom-web/{path}"
    
    # Simple permissions: you might want to enforce valid JWT for certain operations here.
    # We will enforce basic proxy headers for now.
    headers = dict(request.headers)
    headers.pop("host", None)
    
    body = await request.body()
    
    try:
        if request.method == "POST":
            # For upload via STOW-RS, doctors must be logged in. 
            # In production, wrap this with a JWT auth dependency.
            res = requests.request(
                method=request.method,
                url=orthanc_target_url,
                headers=headers,
                data=body,
                auth=get_orthanc_auth(),
                stream=True
            )
        else:
            # WADO-RS / QIDO-RS might be accessed publicly if shared link is provided?
            # Or this might require auth. For MVP proxying, just pass through.
            res = requests.request(
                method=request.method,
                url=orthanc_target_url,
                headers=headers,
                params=request.query_params,
                auth=get_orthanc_auth(),
                stream=True
            )
            
        excluded_headers = ["content-encoding", "content-length", "transfer-encoding", "connection"]
        resp_headers = {
            k: v for k, v in res.headers.items() if k.lower() not in excluded_headers
        }
        
        return Response(content=res.content, status_code=res.status_code, headers=resp_headers)
        
    except Exception as e:
        logger.error(f"DICOMweb proxy error: {str(e)}")
        raise HTTPException(status_code=502, detail="Bad Gateway error proxying to Orthanc PACS")
