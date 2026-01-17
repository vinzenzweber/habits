import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFullscreen } from "../fullscreen";
import { RefObject } from "react";

// Helper to create mock element with fullscreen methods
const createMockElement = (overrides = {}) => {
  const element = document.createElement("div");
  return Object.assign(element, {
    requestFullscreen: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
};

describe("useFullscreen", () => {
  let mockElement: HTMLElement & { requestFullscreen: ReturnType<typeof vi.fn> };
  let mockRef: RefObject<HTMLElement | null>;
  let originalExitFullscreen: typeof document.exitFullscreen;

  beforeEach(() => {
    mockElement = createMockElement();
    mockRef = { current: mockElement };

    // Store original exitFullscreen
    originalExitFullscreen = document.exitFullscreen;

    // Mock document.exitFullscreen
    Object.defineProperty(document, "exitFullscreen", {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    });

    // Ensure fullscreenEnabled is true for tests
    Object.defineProperty(document, "fullscreenEnabled", {
      value: true,
      writable: true,
      configurable: true,
    });

    // Reset fullscreenElement to null
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Restore original exitFullscreen
    Object.defineProperty(document, "exitFullscreen", {
      value: originalExitFullscreen,
      writable: true,
      configurable: true,
    });
  });

  describe("isSupported", () => {
    it("returns true when fullscreenEnabled is available", () => {
      const { result } = renderHook(() => useFullscreen(mockRef));
      expect(result.current.isSupported).toBe(true);
    });

    it("returns true when webkit prefix is available", () => {
      // Remove standard API
      Object.defineProperty(document, "fullscreenEnabled", {
        value: undefined,
        configurable: true,
      });
      // Add webkit
      Object.defineProperty(document, "webkitFullscreenEnabled", {
        value: true,
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));
      expect(result.current.isSupported).toBe(true);

      // Cleanup
      delete (document as Record<string, unknown>).webkitFullscreenEnabled;
    });

    it("returns true when moz prefix is available", () => {
      Object.defineProperty(document, "fullscreenEnabled", {
        value: undefined,
        configurable: true,
      });
      Object.defineProperty(document, "mozFullScreenEnabled", {
        value: true,
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));
      expect(result.current.isSupported).toBe(true);

      // Cleanup
      delete (document as Record<string, unknown>).mozFullScreenEnabled;
    });

    it("returns true when ms prefix is available", () => {
      Object.defineProperty(document, "fullscreenEnabled", {
        value: undefined,
        configurable: true,
      });
      Object.defineProperty(document, "msFullscreenEnabled", {
        value: true,
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));
      expect(result.current.isSupported).toBe(true);

      // Cleanup
      delete (document as Record<string, unknown>).msFullscreenEnabled;
    });

    it("returns false when no fullscreen API is available", () => {
      Object.defineProperty(document, "fullscreenEnabled", {
        value: undefined,
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe("initial state", () => {
    it("starts with isFullscreen as false", () => {
      const { result } = renderHook(() => useFullscreen(mockRef));
      expect(result.current.isFullscreen).toBe(false);
    });
  });

  describe("enterFullscreen", () => {
    it("calls requestFullscreen on the referenced element", async () => {
      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(mockElement.requestFullscreen).toHaveBeenCalled();
    });

    it("falls back to webkitRequestFullscreen", async () => {
      const webkitRequestFullscreen = vi.fn().mockResolvedValue(undefined);
      mockElement = createMockElement({
        requestFullscreen: undefined,
        webkitRequestFullscreen,
      });
      mockRef = { current: mockElement };

      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(webkitRequestFullscreen).toHaveBeenCalled();
    });

    it("falls back to mozRequestFullScreen", async () => {
      const mozRequestFullScreen = vi.fn().mockResolvedValue(undefined);
      mockElement = createMockElement({
        requestFullscreen: undefined,
        mozRequestFullScreen,
      });
      mockRef = { current: mockElement };

      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(mozRequestFullScreen).toHaveBeenCalled();
    });

    it("falls back to msRequestFullscreen", async () => {
      const msRequestFullscreen = vi.fn().mockResolvedValue(undefined);
      mockElement = createMockElement({
        requestFullscreen: undefined,
        msRequestFullscreen,
      });
      mockRef = { current: mockElement };

      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(msRequestFullscreen).toHaveBeenCalled();
    });

    it("does nothing when ref is null", async () => {
      const nullRef: RefObject<HTMLElement | null> = { current: null };
      const { result } = renderHook(() => useFullscreen(nullRef));

      await act(async () => {
        await result.current.enterFullscreen();
      });

      // Should not throw, just return early
      expect(mockElement.requestFullscreen).not.toHaveBeenCalled();
    });

    it("does nothing when fullscreen is not supported", async () => {
      Object.defineProperty(document, "fullscreenEnabled", {
        value: undefined,
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(mockElement.requestFullscreen).not.toHaveBeenCalled();
    });

    it("handles errors gracefully", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockElement = createMockElement({
        requestFullscreen: vi.fn().mockRejectedValue(new Error("Denied")),
      });
      mockRef = { current: mockElement };

      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(consoleError).toHaveBeenCalledWith(
        "Failed to enter fullscreen:",
        expect.any(Error)
      );
      consoleError.mockRestore();
    });
  });

  describe("exitFullscreen", () => {
    it("calls exitFullscreen on document", async () => {
      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.exitFullscreen();
      });

      expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it("falls back to webkitExitFullscreen", async () => {
      const webkitExitFullscreen = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(document, "exitFullscreen", {
        value: undefined,
        configurable: true,
      });
      Object.defineProperty(document, "webkitExitFullscreen", {
        value: webkitExitFullscreen,
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.exitFullscreen();
      });

      expect(webkitExitFullscreen).toHaveBeenCalled();

      // Cleanup
      delete (document as Record<string, unknown>).webkitExitFullscreen;
    });

    it("falls back to mozCancelFullScreen", async () => {
      const mozCancelFullScreen = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(document, "exitFullscreen", {
        value: undefined,
        configurable: true,
      });
      Object.defineProperty(document, "mozCancelFullScreen", {
        value: mozCancelFullScreen,
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.exitFullscreen();
      });

      expect(mozCancelFullScreen).toHaveBeenCalled();

      // Cleanup
      delete (document as Record<string, unknown>).mozCancelFullScreen;
    });

    it("falls back to msExitFullscreen", async () => {
      const msExitFullscreen = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(document, "exitFullscreen", {
        value: undefined,
        configurable: true,
      });
      Object.defineProperty(document, "msExitFullscreen", {
        value: msExitFullscreen,
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.exitFullscreen();
      });

      expect(msExitFullscreen).toHaveBeenCalled();

      // Cleanup
      delete (document as Record<string, unknown>).msExitFullscreen;
    });

    it("handles errors gracefully", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      Object.defineProperty(document, "exitFullscreen", {
        value: vi.fn().mockRejectedValue(new Error("Failed")),
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));

      await act(async () => {
        await result.current.exitFullscreen();
      });

      expect(consoleError).toHaveBeenCalledWith(
        "Failed to exit fullscreen:",
        expect.any(Error)
      );
      consoleError.mockRestore();
    });
  });

  describe("toggleFullscreen", () => {
    it("calls enterFullscreen when not in fullscreen mode", async () => {
      const { result } = renderHook(() => useFullscreen(mockRef));

      expect(result.current.isFullscreen).toBe(false);

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockElement.requestFullscreen).toHaveBeenCalled();
      expect(document.exitFullscreen).not.toHaveBeenCalled();
    });

    it("calls exitFullscreen when in fullscreen mode", async () => {
      // Set element as currently fullscreen
      Object.defineProperty(document, "fullscreenElement", {
        value: mockElement,
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));

      // Trigger event to update state
      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });

      expect(result.current.isFullscreen).toBe(true);

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(document.exitFullscreen).toHaveBeenCalled();
    });
  });

  describe("event listeners", () => {
    it("updates isFullscreen state when fullscreenchange fires", () => {
      const { result } = renderHook(() => useFullscreen(mockRef));

      expect(result.current.isFullscreen).toBe(false);

      // Simulate entering fullscreen
      Object.defineProperty(document, "fullscreenElement", {
        value: mockElement,
        configurable: true,
      });

      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });

      expect(result.current.isFullscreen).toBe(true);

      // Simulate exiting fullscreen
      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });

      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });

      expect(result.current.isFullscreen).toBe(false);
    });

    it("reports isFullscreen false when a different element is fullscreen", () => {
      // Create a different element that is NOT the ref
      const differentElement = document.createElement("div");

      const { result } = renderHook(() => useFullscreen(mockRef));

      expect(result.current.isFullscreen).toBe(false);

      // Simulate a different element entering fullscreen (not our ref)
      Object.defineProperty(document, "fullscreenElement", {
        value: differentElement,
        configurable: true,
      });

      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });

      // isFullscreen should remain false because differentElement !== ref.current
      expect(result.current.isFullscreen).toBe(false);

      // Now simulate our element entering fullscreen
      Object.defineProperty(document, "fullscreenElement", {
        value: mockElement,
        configurable: true,
      });

      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });

      // Now it should be true because mockElement === ref.current
      expect(result.current.isFullscreen).toBe(true);
    });

    it("handles webkit fullscreen element changes", () => {
      // Remove standard API
      Object.defineProperty(document, "fullscreenElement", {
        value: undefined,
        configurable: true,
      });

      const { result } = renderHook(() => useFullscreen(mockRef));

      expect(result.current.isFullscreen).toBe(false);

      // Simulate entering fullscreen via webkit
      Object.defineProperty(document, "webkitFullscreenElement", {
        value: mockElement,
        configurable: true,
      });

      act(() => {
        document.dispatchEvent(new Event("webkitfullscreenchange"));
      });

      expect(result.current.isFullscreen).toBe(true);

      // Cleanup
      delete (document as Record<string, unknown>).webkitFullscreenElement;
    });

    it("cleans up event listeners on unmount", () => {
      const addSpy = vi.spyOn(document, "addEventListener");
      const removeSpy = vi.spyOn(document, "removeEventListener");

      const { unmount } = renderHook(() => useFullscreen(mockRef));

      // Should have added listeners
      expect(addSpy).toHaveBeenCalledWith("fullscreenchange", expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith("webkitfullscreenchange", expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith("mozfullscreenchange", expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith("MSFullscreenChange", expect.any(Function));

      unmount();

      // Should have removed listeners
      expect(removeSpy).toHaveBeenCalledWith("fullscreenchange", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith("webkitfullscreenchange", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith("mozfullscreenchange", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith("MSFullscreenChange", expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe("multiple mount/unmount cycles", () => {
    it("does not leak event listeners", () => {
      const addSpy = vi.spyOn(document, "addEventListener");
      const removeSpy = vi.spyOn(document, "removeEventListener");

      // First mount/unmount
      const { unmount: unmount1 } = renderHook(() => useFullscreen(mockRef));
      const addCallsAfterMount1 = addSpy.mock.calls.length;
      unmount1();
      const removeCallsAfterUnmount1 = removeSpy.mock.calls.length;
      expect(removeCallsAfterUnmount1).toBe(addCallsAfterMount1);

      // Second mount/unmount
      const { unmount: unmount2 } = renderHook(() => useFullscreen(mockRef));
      const addCallsAfterMount2 = addSpy.mock.calls.length - addCallsAfterMount1;
      unmount2();
      const removeCallsAfterUnmount2 = removeSpy.mock.calls.length - removeCallsAfterUnmount1;
      expect(removeCallsAfterUnmount2).toBe(addCallsAfterMount2);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
