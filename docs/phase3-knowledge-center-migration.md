# Phase 3 — Knowledge Center Migration

## 目标
将 `script` 中的知识库能力完全迁移到 `MODAUI` 的 Knowledge Center。

## 范围
### 迁移模型
- `KnowledgeBaseArticle`
- `KnowledgeBaseArticleGroup`
- `KnowledgeBaseArticleFeedback`

### 迁移控制器
- `KnowledgeBaseArticleController`
- `KnowledgeBaseArticleGroupController`

### 未来 AI
- `AI Knowledge Manager`

## 执行步骤
1. 创建 `src/modules/knowledge-center` 或 `src/components/knowledge-center` 目录。
2. 提取知识库文章、分组、反馈的核心字段和标签结构。
3. 吸收知识库文章管理、分组管理、用户反馈逻辑。
4. 设计 `Knowledge Center` 与其他中心的数据链接：产品知识、客户知识、运营知识、团队知识。
5. 废弃 Stocky 知识库前端，仅保留知识能力层。

## 风险点
- 知识分类体系需要与 MODAUI 的行业与产品结构统一。
- 反馈与评分机制应避免与现有评论系统冲突。

## 下一步
- 审查 `KnowledgeBaseArticleController` 的主要方法。
- 定义 Knowledge Center 的基础查询、创建、更新和反馈工作流。
