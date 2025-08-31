import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { IncomingForm } from "formidable";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Readable } from "stream";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { TaskType } from "@google/generative-ai";

// import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";

export const config = {
  api: { bodyParser: false },
};

export async function POST(request) {
    // Convert Web Request to Node.js stream
    const nodeRequest = Object.assign(Readable.fromWeb(request.body), {
        headers: Object.fromEntries(request.headers),
        method: request.method,
        url: request.url,
    });

    const form = new IncomingForm();
    
    const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(nodeRequest, async (err, fields, files) => {
            if (err) {
                console.error("Error parsing form:", err);
                return reject(err);
            }
            resolve({ fields, files });
        });
    });

    // console.log("Parsed Fields:", fields);
    // console.log("Parsed Files:", files);

  try {
    let docs = [];

    // Text input
    if (fields.text !== "") {
        docs.push(new Document({ pageContent: fields.text }));
      }

    // URL input
    if (typeof fields.url === "string" && fields.url.trim() !== "") {
      const loader = new CheerioWebBaseLoader(fields.url);
      const urlDocs = await loader.load();
      docs = docs.concat(urlDocs);
    }

    // PDF input
    if (files.file) {
      console.log("File Path:", files.file[0].filepath);
      const loader = new PDFLoader(files.file[0].filepath);
      const pdfDocs = await loader.load();
        docs = docs.concat(pdfDocs);
      }
      
      const cleanDocs = docs
        .filter(
          (doc) =>
            doc instanceof Document && typeof doc.pageContent === "string"
        )
        .map((doc) => {
          doc.pageContent = doc.pageContent.replace(/\s+/g, " ").trim();
          return doc;
        })
      .filter((doc) => doc.pageContent.length > 0);
    
    console.log("Final docs count: ", cleanDocs.length);
        
        if (docs.length !== cleanDocs.length) {
            console.warn(
                `Filtered out ${docs.length - cleanDocs.length} invalid documents`
            );
    }

    // Embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "embedding-001",
      apiKey: process.env.GOOGLE_API_KEY,
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });
      
      const vector = await embeddings.embedQuery("test");
    console.log("Vector length:", vector.length); 

    const sampleVec = await embeddings.embedQuery(cleanDocs[0].pageContent);
    console.log("Sample embedding length:", sampleVec.length);

    // Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.splitDocuments(cleanDocs);
    const finalDocs = splitDocs.filter((d) => d.pageContent.trim().length > 0);

    console.log("Docs to embed:", finalDocs.length);
    
    // Store in Qdrant
    // for (let i = 0; i < finalDocs.length; i += 100) {
    //   const batch = finalDocs.slice(i, i + 100);
      await QdrantVectorStore.fromDocuments(finalDocs, embeddings, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: "rag_docs",
        collectionConfig: {
          vectors: {
            size: 768,
            distance: "Cosine",
          }
        }
      });
      
    //   console.log(
    //     `Inserted batch ${i / 100 + 1}`
    //   );
    // }

    // const vectorStore = await QdrantVectorStore.fromExistingCollection(
    //   embeddings,
    //   {
    //     url: process.env.QDRANT_URL,
    //     apiKey: process.env.QDRANT_API_KEY,
    //     collectionName: "rag_docs",
    //   }
    // );
    // for (let i = 0; i < finalDocs.length; i += 100) {
    //   const batch = finalDocs.slice(i, i + 100);
    //   await vectorStore.addDocuments(batch);
    //   console.log(
    //     `Inserted batch ${i / 100 + 1}`
    //   );
    // }
    
    return Response.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
