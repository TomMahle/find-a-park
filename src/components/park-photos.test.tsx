import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FallbackPhoto } from "@/lib/parks/fallback-photos";
import { ParkPhotos } from "./park-photos";

const listed = ["https://example.com/a.jpg", "https://example.com/b.jpg"];

const fallback: FallbackPhoto[] = [
  {
    src: "https://commons.example/boathouse.jpg",
    alt: "The boathouse by the lake",
    credit: {
      author: "Jane Photographer",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Boathouse.jpg",
    },
  },
];

const fail = (alt: string) => fireEvent.error(screen.getByAltText(alt));

describe("ParkPhotos", () => {
  it("labels each listed photo with the park name and its position", () => {
    render(<ParkPhotos parkName="Elm Park" images={listed} fallback={[]} />);
    expect(screen.getByAltText("Elm Park, photo 1 of 2")).toBeInTheDocument();
    expect(screen.getByAltText("Elm Park, photo 2 of 2")).toBeInTheDocument();
  });

  it("replaces only the photo that failed with a labeled placeholder", () => {
    render(<ParkPhotos parkName="Elm Park" images={listed} fallback={[]} />);
    fail("Elm Park, photo 1 of 2");

    expect(
      screen.getByRole("img", { name: "Elm Park, photo 1 of 2 (unavailable)" }),
    ).toHaveTextContent("Photo unavailable");
    expect(screen.getByAltText("Elm Park, photo 2 of 2")).toBeInTheDocument();
  });

  describe("fallback photos", () => {
    it("are not shown while any listed photo can still load", () => {
      render(
        <ParkPhotos parkName="Elm Park" images={listed} fallback={fallback} />,
      );
      expect(screen.queryByAltText("The boathouse by the lake")).toBeNull();

      // One listed photo failing isn't enough: the other one works.
      fail("Elm Park, photo 1 of 2");
      expect(screen.queryByAltText("The boathouse by the lake")).toBeNull();
      expect(screen.getByAltText("Elm Park, photo 2 of 2")).toBeInTheDocument();
    });

    it("replace the listing's photos once every one has failed", () => {
      render(
        <ParkPhotos parkName="Elm Park" images={listed} fallback={fallback} />,
      );
      fail("Elm Park, photo 1 of 2");
      fail("Elm Park, photo 2 of 2");

      expect(
        screen.getByAltText("The boathouse by the lake"),
      ).toBeInTheDocument();
      expect(screen.queryByAltText(/Elm Park, photo/)).toBeNull();
      expect(
        screen.getByText(/listing’s photos couldn’t be loaded/),
      ).toBeInTheDocument();
    });

    it("are shown when the listing has no photos, with credit", () => {
      render(
        <ParkPhotos parkName="Elm Park" images={[]} fallback={fallback} />,
      );
      expect(screen.getByText(/listing has no photos/)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Jane Photographer" }),
      ).toHaveAttribute(
        "href",
        "https://commons.wikimedia.org/wiki/File:Boathouse.jpg",
      );
      expect(
        screen.getByRole("link", { name: "CC BY-SA 4.0" }),
      ).toHaveAttribute(
        "href",
        "https://creativecommons.org/licenses/by-sa/4.0/",
      );
    });

    it("show a placeholder if a fallback photo fails too", () => {
      render(
        <ParkPhotos parkName="Elm Park" images={[]} fallback={fallback} />,
      );
      fail("The boathouse by the lake");
      expect(
        screen.getByRole("img", {
          name: "The boathouse by the lake (unavailable)",
        }),
      ).toBeInTheDocument();
    });
  });
});
