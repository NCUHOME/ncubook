import assert from "node:assert/strict";
import {
    classifyEvalFailure,
    type EvalChecks,
} from "../lib/eval-analysis";

const passingChecks: EvalChecks = {
    apiOk: true,
    hasAnswer: true,
    hasSourceHeading: true,
    hasFollowUpHeading: true,
    hasQueryLogId: true,
    hasRetrievalState: true,
    mentionsRequiredTerms: true,
    verificationBoundary: true,
};

function withChecks(overrides: Partial<EvalChecks>) {
    return {
        ...passingChecks,
        ...overrides,
    };
}

assert.equal(
    classifyEvalFailure({
        checks: passingChecks,
        retrievalState: "strong",
        risk: "low",
    }).failureCategory,
    "passed"
);

assert.equal(
    classifyEvalFailure({
        checks: withChecks({ apiOk: false }),
        retrievalState: "strong",
        risk: "low",
    }).failureCategory,
    "api_error"
);

assert.equal(
    classifyEvalFailure({
        checks: withChecks({ hasSourceHeading: false }),
        retrievalState: "strong",
        risk: "low",
    }).failureCategory,
    "format_error"
);

assert.equal(
    classifyEvalFailure({
        checks: withChecks({ hasQueryLogId: false }),
        retrievalState: "strong",
        risk: "low",
    }).failureCategory,
    "logging_error"
);

assert.equal(
    classifyEvalFailure({
        checks: withChecks({ mentionsRequiredTerms: false }),
        retrievalState: "weak",
        risk: "medium",
    }).failureCategory,
    "retrieval_or_knowledge_gap"
);

assert.equal(
    classifyEvalFailure({
        checks: withChecks({ mentionsRequiredTerms: false }),
        retrievalState: "strong",
        risk: "medium",
    }).failureCategory,
    "missing_required_content"
);

const trustBoundary = classifyEvalFailure({
    checks: withChecks({ verificationBoundary: false }),
    retrievalState: "strong",
    risk: "high",
});

assert.equal(trustBoundary.failureCategory, "trust_boundary");
assert.match(trustBoundary.suggestedAction, /官方|核实|承诺/);

console.log("eval failure analysis tests passed");
