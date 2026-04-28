import assert from "node:assert/strict";
import {
    buildEvalCandidates,
    candidateFromFeedback,
    candidateFromKnowledgeGap,
    candidateFromQueryLog,
    inferCandidateRisk,
} from "../lib/eval-candidates";

assert.equal(inferCandidateRisk("转专业是不是绩点高就一定能转？"), "high");
assert.equal(inferCandidateRisk("校园卡丢了怎么办？"), "medium");
assert.equal(inferCandidateRisk("南昌大学有什么社团？"), "low");

const weakQuery = candidateFromQueryLog({
    id: "log_1",
    question: "宿舍可以养猫吗？",
    current_path: "/xiaojiayuan",
    retrieval_state: "weak",
    source_count: 3,
    max_similarity: 0.28,
    created_at: "2026-04-28T10:00:00.000Z",
});

assert.equal(weakQuery?.source, "query_log");
assert.equal(weakQuery?.failure_hint, "retrieval_or_knowledge_gap");

const ignoredStrongQuery = candidateFromQueryLog({
    id: "log_2",
    question: "校园卡丢了怎么办？",
    retrieval_state: "strong",
    source_count: 5,
    max_similarity: 0.72,
    created_at: "2026-04-28T10:01:00.000Z",
});

assert.equal(ignoredStrongQuery, null);

const feedbackCandidate = candidateFromFeedback(
    {
        id: "feedback_1",
        vote: "not_helpful",
        query_log_id: "log_3",
        page_path: "/docs/academics/major-change",
        question: "转专业是不是绩点够高就一定能转？",
        created_at: "2026-04-28T10:02:00.000Z",
    },
    {
        id: "log_3",
        question: "转专业是不是绩点够高就一定能转？",
        retrieval_state: "strong",
        source_count: 5,
        max_similarity: 0.68,
        created_at: "2026-04-28T10:01:30.000Z",
    }
);

assert.equal(feedbackCandidate?.suggested_risk, "high");
assert.equal(feedbackCandidate?.failure_hint, "answer_quality_or_trust_boundary");

const gapCandidate = candidateFromKnowledgeGap({
    id: "gap_1",
    sample_question: "校园卡周末能补办吗？",
    source_path: "/xiaojiayuan",
    trigger_reason: "no_retrieved_context",
    status: "open",
    occurrence_count: 6,
    last_seen_at: "2026-04-28T10:03:00.000Z",
});

assert.equal(gapCandidate?.source, "knowledge_gap");
assert.equal(gapCandidate?.occurrence_count, 6);

const candidates = buildEvalCandidates({
    queryLogs: [
        {
            id: "log_1",
            question: "宿舍可以养猫吗？",
            retrieval_state: "weak",
            source_count: 3,
            max_similarity: 0.28,
            created_at: "2026-04-28T10:00:00.000Z",
        },
    ],
    feedback: [
        {
            id: "feedback_1",
            vote: "not_helpful",
            query_log_id: "log_1",
            question: "宿舍可以养猫吗？",
            created_at: "2026-04-28T10:04:00.000Z",
        },
    ],
    knowledgeGaps: [],
});

assert.equal(candidates.length, 2);
assert.equal(candidates[0].source, "feedback");

console.log("eval candidate tests passed");
