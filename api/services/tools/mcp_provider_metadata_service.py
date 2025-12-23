from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.tools import MCPToolProvider, MCPToolProviderMetadata


class MCPProviderMetadataService:
    def __init__(self, session: Session):
        self._session = session

    def get_by_provider_id(self, *, tenant_id: str, provider_id: str) -> MCPToolProviderMetadata | None:
        stmt = select(MCPToolProviderMetadata).where(
            MCPToolProviderMetadata.tenant_id == tenant_id, MCPToolProviderMetadata.provider_id == provider_id
        )
        return self._session.scalar(stmt)

    def get_by_server_identifier(self, *, tenant_id: str, server_identifier: str) -> MCPToolProviderMetadata | None:
        stmt = select(MCPToolProviderMetadata).where(
            MCPToolProviderMetadata.tenant_id == tenant_id,
            MCPToolProviderMetadata.server_identifier == server_identifier,
        )
        return self._session.scalar(stmt)

    def list_all(self, *, tenant_id: str) -> list[MCPToolProviderMetadata]:
        stmt = select(MCPToolProviderMetadata).where(MCPToolProviderMetadata.tenant_id == tenant_id)
        return list(self._session.scalars(stmt).all())

    def upsert(
        self,
        *,
        tenant_id: str,
        provider_id: str,
        description: str,
        category_id: str = "",
    ) -> MCPToolProviderMetadata:
        provider = self._session.scalar(
            select(MCPToolProvider).where(MCPToolProvider.tenant_id == tenant_id, MCPToolProvider.id == provider_id)
        )
        if not provider:
            raise ValueError("provider not found")

        meta = self.get_by_provider_id(tenant_id=tenant_id, provider_id=provider_id)
        if not meta:
            meta = MCPToolProviderMetadata(
                tenant_id=tenant_id,
                provider_id=provider_id,
                server_identifier=provider.server_identifier,
                description=description or "",
                category_id=category_id or "",
            )
            self._session.add(meta)
            self._session.flush()
            return meta

        meta.description = description or ""
        meta.category_id = category_id or ""
        meta.server_identifier = provider.server_identifier
        meta.updated_at = datetime.now()
        self._session.flush()
        return meta


