import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationsRail from "../Notifications.rail";
import CommunityRail from "../Community.rail";
import LibraryRail from "../Decks.rail";

describe("NotificationsRail", () => {
  const t = {
    railHeading: "Summary", railActive: "active", railByType: "By type",
    all: "All", review: "Review", sessions: "Sessions", system: "System",
  };
  const counts = { all: 9, review: 4, session: 3, system: 2 };

  it("shows the total and per-type counts", () => {
    render(<NotificationsRail t={t} counts={counts} total={9} filter="all" setFilter={() => {}} />);
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review/ })).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("sets the filter when a type row is clicked", () => {
    const setFilter = vi.fn();
    render(<NotificationsRail t={t} counts={counts} total={9} filter="all" setFilter={setFilter} />);
    fireEvent.click(screen.getByRole("button", { name: /Review/ }));
    expect(setFilter).toHaveBeenCalledWith("review");
  });
});

describe("CommunityRail", () => {
  const t = { railSubjects: "Subjects", allSubjects: "All subjects" };
  const subjectCounts = [
    { subject: "Math", count: 5 },
    { subject: "Science", count: 3 },
  ];

  it("lists subjects with counts plus an all-subjects row", () => {
    render(<CommunityRail t={t} subjectCounts={subjectCounts} total={12} subject="" setSubject={() => {}} />);
    expect(screen.getByRole("button", { name: /All subjects/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Math/ })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("sets the subject filter on click and clears it via all-subjects", () => {
    const setSubject = vi.fn();
    render(<CommunityRail t={t} subjectCounts={subjectCounts} total={12} subject="Math" setSubject={setSubject} />);
    fireEvent.click(screen.getByRole("button", { name: /Science/ }));
    expect(setSubject).toHaveBeenCalledWith("Science");
    fireEvent.click(screen.getByRole("button", { name: /All subjects/ }));
    expect(setSubject).toHaveBeenCalledWith("");
  });
});

describe("LibraryRail", () => {
  const t = {
    railHeading: "Overview", railDecks: "decks", railNeverUsed: "never used",
    railFavorites: "favorites", railByClass: "By class",
    railMostUsed: "Most used", railNoUsage: "No decks used yet",
  };
  const classCounts = [
    { id: "c1", name: "Math 6", count: 7 },
    { id: "c2", name: "Science 9", count: 3 },
  ];

  it("shows deck stats and a by-class breakdown", () => {
    render(
      <LibraryRail t={t} totalDecks={10} neverUsed={3} favoritesCount={2}
        classCounts={classCounts} activeClassTab="c1" onPickClass={() => {}} />
    );
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("never used")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Science 9/ })).toBeInTheDocument();
  });

  it("lists the most-used decks, or a friendly note when none are used", () => {
    const { rerender } = render(
      <LibraryRail t={t} totalDecks={10} neverUsed={3} favoritesCount={2}
        topDecks={[{ id: "d1", title: "Verbs Quiz", uses: 9 }]}
        classCounts={classCounts} activeClassTab="c1" onPickClass={() => {}} />
    );
    expect(screen.getByText("Most used")).toBeInTheDocument();
    expect(screen.getByText("Verbs Quiz")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();

    rerender(
      <LibraryRail t={t} totalDecks={4} neverUsed={4} favoritesCount={0}
        topDecks={[]} classCounts={classCounts} activeClassTab="c1" onPickClass={() => {}} />
    );
    expect(screen.getByText("No decks used yet")).toBeInTheDocument();
  });

  it("switches the active class tab on click", () => {
    const onPickClass = vi.fn();
    render(
      <LibraryRail t={t} totalDecks={10} neverUsed={0} favoritesCount={0}
        classCounts={classCounts} activeClassTab="c1" onPickClass={onPickClass} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Science 9/ }));
    expect(onPickClass).toHaveBeenCalledWith("c2");
  });

  it("hides the by-class card when there's a single class", () => {
    render(
      <LibraryRail t={t} totalDecks={4} neverUsed={0} favoritesCount={0}
        classCounts={[{ id: "c1", name: "Math 6", count: 4 }]} activeClassTab="c1" onPickClass={() => {}} />
    );
    expect(screen.queryByText("By class")).not.toBeInTheDocument();
  });
});
