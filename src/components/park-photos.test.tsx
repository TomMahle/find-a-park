import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ParkPhotos } from "./park-photos";

describe("ParkPhotos", () => {
  const images = ["https://example.com/a.jpg", "https://example.com/b.jpg"];

  it("labels each photo with the park name and its position", () => {
    render(<ParkPhotos parkName="Elm Park" images={images} />);
    expect(screen.getByAltText("Elm Park, photo 1 of 2")).toBeInTheDocument();
    expect(screen.getByAltText("Elm Park, photo 2 of 2")).toBeInTheDocument();
  });

  it("replaces only the photo that failed with a labeled placeholder", () => {
    render(<ParkPhotos parkName="Elm Park" images={images} />);
    fireEvent.error(screen.getByAltText("Elm Park, photo 1 of 2"));

    expect(
      screen.getByRole("img", { name: "Elm Park, photo 1 of 2 (unavailable)" }),
    ).toHaveTextContent("Photo unavailable");
    expect(screen.getByAltText("Elm Park, photo 2 of 2")).toBeInTheDocument();
  });
});
