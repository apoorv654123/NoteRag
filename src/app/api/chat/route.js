import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import OpenAI from "openai";
import { QdrantVectorStore } from "@langchain/qdrant";

const openai = new OpenAI({
  apiKey: process.env.GOOGLE_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export async function POST(request) {
  try {
    const { query } = await request.json();
    console.log("User query:", query);

    // Embeddings for retrieval
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-001",
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL,
        collectionName: "rag_docs",
        apiKey: process.env.QDRANT_API_KEY,
      }
    );

    const retriever = vectorStore.asRetriever({
        k: 3,
    });
    
    const relevantChunk = await retriever.invoke(query);

      // Ask Gemini
      const SYSTEM_PROMPT = ` You are an AI assistant who helps resolving user query based on the
    context available to you from a PDF file with the content and page number.

    Only ans based on the available context from file only.

    Context:
    ${JSON.stringify(relevantChunk)}
  `;
      
    const result = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: query,
        },
      ],
    });

      return Response.json(
          { answer: result.choices[0].message.content },
          { status: 200}
      );
  } catch (e) {
    console.error(e);
      return Response.json(
          { error: "Chat failed" },
          { status: 500 }
      );
  }
}
