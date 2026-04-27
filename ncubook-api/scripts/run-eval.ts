import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type EvalCase = {
    id: string;
    query: string;
    currentPath: string;
    risk: "low" | "medium" | "high";
    expectedRoute: string;
    mustMention: string[];
    requiresVerification: boolean;
};

type EvalResult = {
    id: string;
    passed: boolean;
    score: number;
    checks: Record<string, boolean>;
    headers: {
        queryLogId: string;
        retrievalState: string;
        sourceCount: string;
    };
    answerExcerpt: string;
};

const API_URL = process.env.EVAL_API_URL || "https://ncubook-api.vercel.app/api/chat";
const casesPath = path.join(process.cwd(), "evals/cases/campus-qa-v1.json");
const resultsDir = path.join(process.cwd(), "evals/results");

function cleanText(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

async function askAgent(evalCase: EvalCase) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: [{ role: "user", content: evalCase.query }],
            currentPath: evalCase.currentPath,
        }),
    });

    const answer = await response.text();

    return {
        ok: response.ok,
        answer,
        headers: {
            queryLogId: response.headers.get("X-Ncubook-Query-Id") || "",
            retrievalState: response.headers.get("X-Ncubook-Retrieval-State") || "",
            sourceCount: response.headers.get("X-Ncubook-Source-Count") || "",
        },
    };
}

function evaluateAnswer(evalCase: EvalCase, answer: string, ok: boolean, headers: EvalResult["headers"]) {
    const normalizedAnswer = cleanText(answer);
    const checks = {
        apiOk: ok,
        hasAnswer: normalizedAnswer.length > 20,
        hasSourceHeading: answer.includes("### 信息来源"),
        hasFollowUpHeading: answer.includes("### 继续追问"),
        hasQueryLogId: Boolean(headers.queryLogId),
        hasRetrievalState: Boolean(headers.retrievalState),
        mentionsRequiredTerms: evalCase.mustMention.every((term) => normalizedAnswer.includes(term)),
        verificationBoundary: !evalCase.requiresVerification || /核实|官方|人工|确认|不能直接/.test(normalizedAnswer),
    };

    const passedCount = Object.values(checks).filter(Boolean).length;
    const score = Math.round((passedCount / Object.keys(checks).length) * 100);

    return {
        passed: score >= 75,
        score,
        checks,
    };
}

async function main() {
    const rawCases = await readFile(casesPath, "utf8");
    const evalCases = JSON.parse(rawCases) as EvalCase[];
    const results: EvalResult[] = [];

    for (const evalCase of evalCases) {
        process.stdout.write(`Running ${evalCase.id}... `);
        const { ok, answer, headers } = await askAgent(evalCase);
        const evaluation = evaluateAnswer(evalCase, answer, ok, headers);

        results.push({
            id: evalCase.id,
            ...evaluation,
            headers,
            answerExcerpt: cleanText(answer).slice(0, 500),
        });

        process.stdout.write(`${evaluation.passed ? "PASS" : "FAIL"} ${evaluation.score}\n`);
    }

    const passed = results.filter((result) => result.passed).length;
    const summary = {
        apiUrl: API_URL,
        runAt: new Date().toISOString(),
        total: results.length,
        passed,
        passRate: results.length > 0 ? Math.round((passed / results.length) * 100) : 0,
        results,
    };

    await mkdir(resultsDir, { recursive: true });
    const outPath = path.join(resultsDir, `campus-qa-v1-${Date.now()}.json`);
    await writeFile(outPath, JSON.stringify(summary, null, 2));

    console.log(`\nEval complete: ${passed}/${results.length} passed`);
    console.log(`Result saved to ${outPath}`);

    if (summary.passRate < 75) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
