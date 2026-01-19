/**
 * Tests for ProcessPdfJob
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules before imports
vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

vi.mock("@/lib/pdf-utils", () => ({
  getPdfInfo: vi.fn(),
  renderPdfPageToImage: vi.fn(),
}));

// Mock ExtractRecipeFromImageJob module
vi.mock("../ExtractRecipeFromImageJob", () => ({
  ExtractRecipeFromImageJob: class MockExtractRecipeFromImageJob {},
}));

// Mock sidequest module with factory that creates fresh mocks
vi.mock("sidequest", () => {
  const mockEnqueue = vi.fn();
  const mockJobBuilder = {
    queue: vi.fn().mockReturnThis(),
    timeout: vi.fn().mockReturnThis(),
    maxAttempts: vi.fn().mockReturnThis(),
    enqueue: mockEnqueue,
  };
  return {
    Job: class MockJob {},
    Sidequest: {
      build: vi.fn().mockReturnValue(mockJobBuilder),
    },
    __mockEnqueue: mockEnqueue,
    __mockJobBuilder: mockJobBuilder,
  };
});

import { query } from "@/lib/db";
import { getPdfInfo, renderPdfPageToImage } from "@/lib/pdf-utils";
import { Sidequest } from "sidequest";
import {
  ProcessPdfJob,
  type ProcessPdfJobParams,
} from "../ProcessPdfJob";

// Get the mock functions from the mocked module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sidequestModule = await import("sidequest") as any;
const mockEnqueue = sidequestModule.__mockEnqueue as ReturnType<typeof vi.fn>;
const mockJobBuilder = sidequestModule.__mockJobBuilder as {
  queue: ReturnType<typeof vi.fn>;
  timeout: ReturnType<typeof vi.fn>;
  maxAttempts: ReturnType<typeof vi.fn>;
  enqueue: ReturnType<typeof vi.fn>;
};

describe("ProcessPdfJob", () => {
  const mockQuery = query as ReturnType<typeof vi.fn>;
  const mockGetPdfInfo = getPdfInfo as ReturnType<typeof vi.fn>;
  const mockRenderPdfPageToImage = renderPdfPageToImage as ReturnType<
    typeof vi.fn
  >;

  const defaultParams: ProcessPdfJobParams = {
    pdfJobId: 123,
    userId: 456,
    pdfBase64: Buffer.from("fake pdf content").toString("base64"),
    targetLocale: "en-US",
    targetRegion: "US",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    mockEnqueue.mockResolvedValue({ id: "child-job-123" });
    // Re-establish mockReturnValue for the builder chain after clearAllMocks
    mockJobBuilder.queue.mockReturnThis();
    mockJobBuilder.timeout.mockReturnThis();
    mockJobBuilder.maxAttempts.mockReturnThis();
    (Sidequest.build as ReturnType<typeof vi.fn>).mockReturnValue(mockJobBuilder);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("successful processing", () => {
    it("processes a PDF with multiple pages successfully", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 3 });
      mockRenderPdfPageToImage.mockResolvedValue(
        Buffer.from("fake image data")
      );

      const job = new ProcessPdfJob();
      const result = await job.run(defaultParams);

      expect(result).toEqual({
        pdfJobId: 123,
        totalPages: 3,
        childJobsCreated: 3,
      });
    });

    it("updates status to processing at job start", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 1 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      await job.run(defaultParams);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'processing'"),
        [123]
      );
    });

    it("updates total_pages after parsing PDF", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 5 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      await job.run(defaultParams);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SET total_pages"),
        [5, 123]
      );
    });

    it("renders each page to an image", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 3 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      await job.run(defaultParams);

      expect(mockRenderPdfPageToImage).toHaveBeenCalledTimes(3);
      expect(mockRenderPdfPageToImage).toHaveBeenNthCalledWith(
        1,
        expect.any(Buffer),
        1
      );
      expect(mockRenderPdfPageToImage).toHaveBeenNthCalledWith(
        2,
        expect.any(Buffer),
        2
      );
      expect(mockRenderPdfPageToImage).toHaveBeenNthCalledWith(
        3,
        expect.any(Buffer),
        3
      );
    });

    it("enqueues ExtractRecipeFromImageJob for each page", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 2 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image data"));

      const job = new ProcessPdfJob();
      await job.run(defaultParams);

      expect(Sidequest.build).toHaveBeenCalledTimes(2);
      expect(mockJobBuilder.queue).toHaveBeenCalledWith("recipe-extraction");
      expect(mockJobBuilder.timeout).toHaveBeenCalledWith(120000);
      expect(mockJobBuilder.maxAttempts).toHaveBeenCalledWith(2);
      expect(mockEnqueue).toHaveBeenCalledTimes(2);
    });

    it("passes correct parameters to child jobs", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 1 });
      const imageBuffer = Buffer.from("test image");
      mockRenderPdfPageToImage.mockResolvedValue(imageBuffer);

      const job = new ProcessPdfJob();
      await job.run(defaultParams);

      expect(mockEnqueue).toHaveBeenCalledWith({
        pdfJobId: 123,
        pageNumber: 1,
        imageBase64: imageBuffer.toString("base64"),
        targetLocale: "en-US",
        targetRegion: "US",
        userId: 456,
      });
    });

    it("inserts child job records into pdf_page_extraction_jobs", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 2 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));
      mockEnqueue.mockResolvedValueOnce({ id: "job-1" });
      mockEnqueue.mockResolvedValueOnce({ id: "job-2" });

      const job = new ProcessPdfJob();
      await job.run(defaultParams);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO pdf_page_extraction_jobs"),
        [123, 1, "job-1"]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO pdf_page_extraction_jobs"),
        [123, 2, "job-2"]
      );
    });

    it("marks job status as pages_queued when all pages are processed", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 2 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      await job.run(defaultParams);

      // Last status update should be 'pages_queued'
      const statusCalls = mockQuery.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("status = 'pages_queued'")
      );
      expect(statusCalls.length).toBe(1);
    });
  });

  describe("empty PDF handling", () => {
    it("handles PDF with 0 pages (moves directly to pages_queued)", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 0 });

      const job = new ProcessPdfJob();
      const result = await job.run(defaultParams);

      expect(result).toEqual({
        pdfJobId: 123,
        totalPages: 0,
        childJobsCreated: 0,
      });

      expect(mockRenderPdfPageToImage).not.toHaveBeenCalled();
      expect(mockEnqueue).not.toHaveBeenCalled();

      // Should still update status to pages_queued
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pages_queued'"),
        [123]
      );
    });
  });

  describe("error handling", () => {
    it("marks job as failed and throws when PDF parsing fails", async () => {
      mockGetPdfInfo.mockRejectedValue(new Error("Invalid PDF format"));

      const job = new ProcessPdfJob();
      await expect(job.run(defaultParams)).rejects.toThrow("Invalid PDF format");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'failed'"),
        ["Invalid PDF format", 123]
      );
    });

    it("marks job as failed and throws when PDF has too many pages", async () => {
      mockGetPdfInfo.mockRejectedValue(
        new Error("PDF has too many pages (51). Maximum: 50")
      );

      const job = new ProcessPdfJob();
      await expect(job.run(defaultParams)).rejects.toThrow(
        "PDF has too many pages (51). Maximum: 50"
      );
    });

    it("marks job as failed and throws when page rendering fails", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 3 });
      mockRenderPdfPageToImage
        .mockResolvedValueOnce(Buffer.from("image"))
        .mockRejectedValueOnce(new Error("Render failed on page 2"));

      const job = new ProcessPdfJob();
      await expect(job.run(defaultParams)).rejects.toThrow(
        "Render failed on page 2"
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'failed'"),
        ["Render failed on page 2", 123]
      );
    });

    it("marks job as failed and throws when child job enqueueing fails", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 2 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));
      mockEnqueue.mockRejectedValue(new Error("Queue unavailable"));

      const job = new ProcessPdfJob();
      await expect(job.run(defaultParams)).rejects.toThrow("Queue unavailable");
    });

    it("handles non-Error exceptions by wrapping in Error", async () => {
      mockGetPdfInfo.mockRejectedValue("String error");

      const job = new ProcessPdfJob();
      await expect(job.run(defaultParams)).rejects.toThrow("Unknown error");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'failed'"),
        ["Unknown error", 123]
      );
    });

    it("sets completed_at timestamp when job fails", async () => {
      mockGetPdfInfo.mockRejectedValue(new Error("Test error"));

      const job = new ProcessPdfJob();
      await expect(job.run(defaultParams)).rejects.toThrow("Test error");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("completed_at = NOW()"),
        expect.any(Array)
      );
    });
  });

  describe("database interactions", () => {
    it("calls database queries in correct order", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 1 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      await job.run(defaultParams);

      const calls = mockQuery.mock.calls.map((call) => {
        const sql = call[0] as string;
        if (sql.includes("status = 'processing'")) return "set_processing";
        if (sql.includes("total_pages")) return "set_total_pages";
        if (sql.includes("INSERT INTO pdf_page_extraction_jobs"))
          return "insert_page_job";
        if (sql.includes("status = 'pages_queued'")) return "set_pages_queued";
        return "unknown";
      });

      expect(calls).toEqual([
        "set_processing",
        "set_total_pages",
        "insert_page_job",
        "set_pages_queued",
      ]);
    });
  });

  describe("base64 encoding", () => {
    it("correctly decodes base64 PDF data", async () => {
      const originalContent = "PDF binary content here";
      const base64Content = Buffer.from(originalContent).toString("base64");

      mockGetPdfInfo.mockResolvedValue({ pageCount: 1 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      await job.run({
        ...defaultParams,
        pdfBase64: base64Content,
      });

      // Check that getPdfInfo was called with a Buffer containing the original content
      const pdfBuffer = mockGetPdfInfo.mock.calls[0][0] as Buffer;
      expect(pdfBuffer.toString()).toBe(originalContent);
    });

    it("correctly encodes rendered images to base64 for child jobs", async () => {
      const imageContent = "PNG image binary data";
      mockGetPdfInfo.mockResolvedValue({ pageCount: 1 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from(imageContent));

      const job = new ProcessPdfJob();
      await job.run(defaultParams);

      const childJobParams = mockEnqueue.mock.calls[0][0];
      expect(childJobParams.imageBase64).toBe(
        Buffer.from(imageContent).toString("base64")
      );
    });
  });

  describe("localization parameters", () => {
    it("passes targetLocale and targetRegion to child jobs", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 1 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      await job.run({
        ...defaultParams,
        targetLocale: "de-DE",
        targetRegion: "DE",
      });

      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          targetLocale: "de-DE",
          targetRegion: "DE",
        })
      );
    });
  });
});
