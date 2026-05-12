import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyMediaProps, injectMediaPreload, getMediaPerformanceProps } from "./mediaUtils";

describe("mediaUtils", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    vi.stubGlobal("import.meta", { env: { DEV: true } });
  });

  describe("getMediaPerformanceProps", () => {
    it("returns high priority and eager loading for above fold", () => {
      const props = getMediaPerformanceProps(true);
      expect(props.fetchPriority).toBe("high");
      expect(props.loading).toBe("eager");
      expect(props.decoding).toBe("async");
    });

    it("returns auto priority and lazy loading for below fold", () => {
      const props = getMediaPerformanceProps(false);
      expect(props.fetchPriority).toBe("auto");
      expect(props.loading).toBe("lazy");
    });

    it("respects explicit priority override", () => {
      const props = getMediaPerformanceProps(true, "low");
      expect(props.fetchPriority).toBe("low");
    });
  });

  describe("applyMediaProps", () => {
    it("returns expected props for a given src", () => {
      const props = applyMediaProps("test.jpg", true);
      expect(props.fetchPriority).toBe("high");
      expect(props.loading).toBe("eager");
      expect(props.preload).toBe("auto");
    });
  });

  describe("injectMediaPreload", () => {
    it("injects a link element into document head", () => {
      injectMediaPreload("test.mp4", "video", "high");
      const link = document.head.querySelector('link[rel="preload"]');
      expect(link).toBeInTheDocument();
      expect(link?.getAttribute("as")).toBe("video");
      expect(link?.getAttribute("href")).toBe("test.mp4");
      expect(link?.getAttribute("fetchpriority")).toBe("high");
    });

    it("does not duplicate preloads for the same URL", () => {
      injectMediaPreload("dup.jpg", "image");
      injectMediaPreload("dup.jpg", "image");
      const links = document.head.querySelectorAll('link[data-media-preload="dup.jpg"]');
      expect(links.length).toBe(1);
    });

    it("respects auto priority by not setting fetchpriority attribute", () => {
      injectMediaPreload("auto.jpg", "image", "auto");
      const link = document.head.querySelector('link[data-media-preload="auto.jpg"]');
      expect(link?.hasAttribute("fetchpriority")).toBe(false);
    });
  });
});
