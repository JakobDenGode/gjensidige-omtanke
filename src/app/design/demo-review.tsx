const reviews = [
  { rating: "4,8", count: 19, comment: "Hjalp meg med inngangen. Nå går vi også tur sammen.", author: "Per" },
  { rating: "4,9", count: 28, comment: "Godt å ha en nabo som stiller opp. Vi hjelper hverandre.", author: "Anne" },
  { rating: "4,9", count: 34, comment: "Ryddet godt rundt huset og tok hensyn til plantene.", author: "Liv" },
  { rating: "4,6", count: 24, comment: "Godt jobbet, snøen forsvant.", author: "Geir" },
];

export default function DemoReview({ id, name }: { id: string; name: string }) {
  // Stable assignment avoids ratings changing on every render.
  const index = Array.from(id).reduce((value, character) => value + character.charCodeAt(0), 0) % reviews.length;
  const review = name.trim().toLocaleLowerCase("nb-NO") === "jabo babo"
    ? { rating: "1,5", count: 1, comment: "Eksempel på en lav vurdering i demoen.", author: "Demobruker" }
    : reviews[index];
  return <><span className="tag">Demoanmeldelse · ikke en ekte vurdering</span><p><span aria-hidden="true">&#9733;</span> {review.rating} av 5 · {review.count} {review.count === 1 ? "anmeldelse" : "anmeldelser"} (demo)</p><blockquote>«{review.comment}»<cite>{review.author} (fiktiv)</cite></blockquote></>;
}
