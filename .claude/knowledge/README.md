# 项目业务知识库

> 此目录由自动初始化脚本创建，用于存储项目级业务知识。

## 文件说明

| 文件 | 说明 |
|------|------|
| `memory.jsonl` | 知识图谱数据（由 project-memory MCP 自动管理） |
| `README.md` | 本说明文件 |

## 知识分层

| 层级 | entityType | 稳定性 | 说明 |
|------|-----------|--------|------|
| L1 | `rule-core` | 极高 | 核心业务规则，不变量 |
| L2 | `rule-constraint` | 高 | 边界约束条件 |
| L3 | `impl-detail` | 中 | 技术实现细节 |

## 标签系统

```
稳定性:  [STABLE] [EVOLVING] [VOLATILE] [DEPRECATED]
置信度:  [confidence:high/medium/low]
来源:    [source:code/doc/user/inferred]
```

## 常用操作

### 查询知识
```javascript
// 搜索关键词
mcp__project-memory__search_nodes({ query: "关键词" })

// 读取全部
mcp__project-memory__read_graph()
```

### 添加知识
```javascript
mcp__project-memory__create_entities({
  entities: [{
    name: "模块/功能/名称",
    entityType: "rule-core",
    observations: [
      "[STABLE] 规则描述",
      "[confidence:high]",
      "[source:user]"
    ]
  }]
})
```

### 建立关系
```javascript
mcp__project-memory__create_relations({
  relations: [{
    from: "实体A",
    to: "实体B",
    relationType: "constrains"
  }]
})
```

## 维护指南

1. **低置信度知识需确认**: `[confidence:low]` 的知识应尽快与业务方确认
2. **定期清理**: 移除 `[DEPRECATED]` 标记的过期知识
3. **保持更新**: 代码变更时同步更新相关知识

---

*自动初始化时间: 2026-02-03*
