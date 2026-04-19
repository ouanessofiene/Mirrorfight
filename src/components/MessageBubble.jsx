function MessageBubble({ role, text }) {
  const isUser = role === "user";

  return (
    <article className={`bubble ${isUser ? "bubble-user" : "bubble-other"}`}>
      <p className="bubble-author">{isUser ? "Toi" : "Autre"}</p>
      <p>{text}</p>
    </article>
  );
}

export default MessageBubble;