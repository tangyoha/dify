from typing import Any, Dict, Optional

from core.workflow.entities.base_node_data_entities import BaseNodeData
from core.workflow.entities.node_entities import NodeRunResult, NodeType
from core.workflow.entities.variable_entities import VariableSelector
from core.workflow.nodes.base_node import BaseNode
from models.workflow import WorkflowNodeExecutionStatus


class UserValidatorNodeData(BaseNodeData):
    """
    用户验证节点数据
    """
    user_id_variable: VariableSelector
    require_user_id: bool = False
    default_user_message: str = "请输入您的用户名以继续"
    anonymous_user_message: str = "您正在以匿名用户身份使用"


class UserValidatorNode(BaseNode):
    """
    用户验证节点
    用于检查用户是否提供了用户标识，并根据配置决定如何处理
    """
    _node_data_cls = UserValidatorNodeData
    _node_type = NodeType.USER_VALIDATOR

    def _run(self, variable_pool: Dict[str, Any]) -> NodeRunResult:
        """
        运行用户验证节点
        
        Args:
            variable_pool: 变量池
            
        Returns:
            NodeRunResult: 节点运行结果
        """
        node_data: UserValidatorNodeData = self.node_data
        
        # 获取用户ID变量
        user_id = self._fetch_variable_value(
            variable_selector=node_data.user_id_variable,
            variable_pool=variable_pool
        )
        
        # 检查用户ID是否存在且不为空
        has_user_id = bool(user_id and str(user_id).strip())
        
        # 准备输出变量
        outputs = {
            'has_user_id': has_user_id,
            'user_id': str(user_id).strip() if user_id else '',
            'is_anonymous': not has_user_id
        }
        
        # 根据配置决定处理逻辑
        if node_data.require_user_id and not has_user_id:
            # 如果要求用户ID但用户未提供，返回提示消息
            outputs['message'] = node_data.default_user_message
            outputs['should_prompt'] = True
        else:
            # 用户已提供ID或不要求用户ID
            if has_user_id:
                outputs['message'] = f"欢迎，{user_id}！"
            else:
                outputs['message'] = node_data.anonymous_user_message
            outputs['should_prompt'] = False
        
        return NodeRunResult(
            status=WorkflowNodeExecutionStatus.SUCCEEDED,
            outputs=outputs
        )

    @classmethod
    def get_default_config(cls, filters: Optional[Dict] = None) -> Dict:
        """
        获取默认配置
        """
        return {
            "type": "user-validator",
            "config": {
                "user_id_variable": {
                    "variable": "sys.user_id",
                    "value_selector": ["sys", "user_id"]
                },
                "require_user_id": False,
                "default_user_message": "请输入您的用户名以继续",
                "anonymous_user_message": "您正在以匿名用户身份使用"
            }
        }

    def get_runtime_state(self) -> Dict[str, Any]:
        """
        获取运行时状态
        """
        return {
            'node_type': self._node_type.value,
            'node_data': self.node_data.model_dump()
        }
