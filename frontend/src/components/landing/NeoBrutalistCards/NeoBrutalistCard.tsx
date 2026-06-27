import React from "react";
import "./NeoBrutalistCard.css";

export interface NeoBrutalistCardProps {
  head: string;
  content: React.ReactNode;
  buttonText: string;
  onButtonClick?: () => void;
}

const NeoBrutalistCard = ({ head, content, buttonText, onButtonClick }: NeoBrutalistCardProps) => (
  <div className="neo-brutalist-card">
    <div className="neo-brutalist-card__window">
      <div className="neo-brutalist-card__head">{head}</div>
      <div className="neo-brutalist-card__content">
        {content}
        <br />
        <button type="button" className="neo-brutalist-card__button" onClick={onButtonClick}>
          {buttonText}
        </button>
      </div>
    </div>
  </div>
);

export default React.memo(NeoBrutalistCard);
