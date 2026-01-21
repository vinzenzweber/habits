/**
 * Tests for ProcessPdfJob
 */
import { tmpdir } from "os";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules before imports
vi.mock("@/lib/pdf-utils", () => ({
  getPdfInfo: vi.fn(),
  renderPdfPageToImage: vi.fn(),
}));

vi.mock("fs/promises", () => {
  const readFile = vi.fn();
  const rm = vi.fn();
  return {
    default: { readFile, rm },
    readFile,
    rm,
  };
});

// Mock ExtractRecipeFromImageJob module
vi.mock("../ExtractRecipeFromImageJob", () => ({
  ExtractRecipeFromImageJob: class MockExtractRecipeFromImageJob {},
}));

// Mock sidequest module with factory that creates fresh mocks
vi.mock("@/lib/sidequest-runtime", () => {
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

import { getPdfInfo, renderPdfPageToImage } from "@/lib/pdf-utils";
import { Sidequest } from "@/lib/sidequest-runtime";
import { readFile, rm } from "fs/promises";
import {
  ProcessPdfJob,
  type ProcessPdfJobParams,
} from "../ProcessPdfJob";

// Get the mock functions from the mocked module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sidequestModule = await import("@/lib/sidequest-runtime") as any;
const mockEnqueue = sidequestModule.__mockEnqueue as ReturnType<typeof vi.fn>;
const mockJobBuilder = sidequestModule.__mockJobBuilder as {
  queue: ReturnType<typeof vi.fn>;
  timeout: ReturnType<typeof vi.fn>;
  maxAttempts: ReturnType<typeof vi.fn>;
  enqueue: ReturnType<typeof vi.fn>;
};

describe("ProcessPdfJob", () => {
  const mockGetPdfInfo = getPdfInfo as ReturnType<typeof vi.fn>;
  const mockRenderPdfPageToImage = renderPdfPageToImage as ReturnType<
    typeof vi.fn
  >;

  const defaultParams: ProcessPdfJobParams = {
    userId: 456,
    pdfPath: `${tmpdir()}/pdf-extraction-test/upload.pdf`,
    targetLocale: "en-US",
    targetRegion: "US",
    totalPages: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readFile).mockResolvedValue(Buffer.from("fake pdf content"));
    vi.mocked(rm).mockResolvedValue();
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
      (job as { id: number }).id = 999;
      const result = await job.run(defaultParams);

      expect(result).toEqual({
        parentJobId: 999,
        totalPages: 3,
        childJobsCreated: 3,
      });
    });

    it("renders each page to an image", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 3 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 1;
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
      (job as { id: number }).id = 10;
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
      (job as { id: number }).id = 77;
      await job.run(defaultParams);

      expect(mockEnqueue).toHaveBeenCalledWith({
        parentJobId: 77,
        pageNumber: 1,
        imageBase64: imageBuffer.toString("base64"),
        targetLocale: "en-US",
        targetRegion: "US",
        userId: 456,
      });
    });
  });

  describe("empty PDF handling", () => {
    it("handles PDF with 0 pages", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 0 });

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 55;
      const result = await job.run(defaultParams);

      expect(result).toEqual({
        parentJobId: 55,
        totalPages: 0,
        childJobsCreated: 0,
      });

      expect(mockRenderPdfPageToImage).not.toHaveBeenCalled();
      expect(mockEnqueue).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("throws when PDF parsing fails", async () => {
      mockGetPdfInfo.mockRejectedValue(new Error("Invalid PDF format"));
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake pdf content"));

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 3;
      await expect(
        job.run({ ...defaultParams, totalPages: 0 })
      ).rejects.toThrow("Invalid PDF format");
    });

    it("throws when page rendering fails", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 3 });
      mockRenderPdfPageToImage
        .mockResolvedValueOnce(Buffer.from("image"))
        .mockRejectedValueOnce(new Error("Render failed on page 2"));

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 4;
      await expect(job.run(defaultParams)).rejects.toThrow(
        "Render failed on page 2"
      );
    });

    it("throws when child job enqueueing fails", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 2 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));
      mockEnqueue.mockRejectedValue(new Error("Queue unavailable"));

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 5;
      await expect(job.run(defaultParams)).rejects.toThrow("Queue unavailable");
    });

    it("wraps non-Error exceptions", async () => {
      mockGetPdfInfo.mockRejectedValue("String error");

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 6;
      await expect(job.run(defaultParams)).rejects.toThrow("Unknown error");
    });
  });

  describe("file handling", () => {
    it("reads PDF data from the temp path", async () => {
      const originalContent = "PDF binary content here";
      vi.mocked(readFile).mockResolvedValue(Buffer.from(originalContent));

      mockGetPdfInfo.mockResolvedValue({ pageCount: 1 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 7;
      await job.run({
        ...defaultParams,
        totalPages: 0,
      });

      const pdfBuffer = mockGetPdfInfo.mock.calls[0][0] as Buffer;
      expect(pdfBuffer.toString()).toBe(originalContent);
    });

    it("correctly encodes rendered images to base64 for child jobs", async () => {
      const imageContent = "PNG image binary data";
      mockGetPdfInfo.mockResolvedValue({ pageCount: 1 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from(imageContent));

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 8;
      await job.run(defaultParams);

      const childJobParams = mockEnqueue.mock.calls[0][0];
      expect(childJobParams.imageBase64).toBe(
        Buffer.from(imageContent).toString("base64")
      );
    });
  });

  describe("page count usage", () => {
    it("uses provided totalPages without re-parsing the PDF", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 3 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 12;
      await job.run({
        ...defaultParams,
        totalPages: 2,
      });

      expect(mockGetPdfInfo).not.toHaveBeenCalled();
      expect(mockRenderPdfPageToImage).toHaveBeenCalledTimes(2);
    });
  });

  describe("cleanup", () => {
    it("removes temp directory after processing", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 1 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 11;
      await job.run(defaultParams);

      expect(rm).toHaveBeenCalledWith(`${tmpdir()}/pdf-extraction-test`, {
        recursive: true,
        force: true,
      });
    });
  });

  describe("localization parameters", () => {
    it("passes targetLocale and targetRegion to child jobs", async () => {
      mockGetPdfInfo.mockResolvedValue({ pageCount: 1 });
      mockRenderPdfPageToImage.mockResolvedValue(Buffer.from("image"));

      const job = new ProcessPdfJob();
      (job as { id: number }).id = 9;
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
