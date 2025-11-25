from typing import Optional

from pydantic import BaseModel, Field

from core.prompt.entities.advanced_prompt_entities import MemoryConfig
from core.workflow.nodes.base import BaseNodeData
from core.workflow.nodes.llm import ModelConfig, VisionConfig


class ClassConfig(BaseModel):
    id: str
    name: str


class QuestionClassifierNodeData(BaseNodeData):
    query_variable_selector: list[str]
    model: ModelConfig
    classes: list[ClassConfig]
    instruction: Optional[str] = None
    memory: Optional[MemoryConfig] = None
    vision: VisionConfig = Field(default_factory=VisionConfig)
    structured_output: dict | None = None
    # We used 'structured_output_enabled' in the past, but it's not a good name.
    structured_output_switch_on: bool = Field(False, alias="structured_output_enabled")

    @property
    def structured_output_enabled(self) -> bool:
        return self.structured_output_switch_on and self.structured_output is not None
