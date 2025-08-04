// collection name on firestore: "userInsights"

// for now, we generate a random id but will have 1 user = 1 userInsight (might add multiple in the future) 
export type userInsight = {
    mainFocus: {
        headline: string,
        description: string,
        sources: insightSource[]
    },
    keyBlockers: {
        headline: string,
        description: string,
        sources: insightSource[]
    },
    plan: {
        headline: string,
        description: string,
        sources: insightSource[]
    },
    userId: string,
    createdAt: number,
    updatedAt: number,
}


export type insightSource = {
    quote: string,
    extractedAt: number,
}
