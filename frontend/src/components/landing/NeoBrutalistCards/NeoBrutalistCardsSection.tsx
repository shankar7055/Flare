import NeoBrutalistCard from "./NeoBrutalistCard";
import { neoBrutalistCards } from "./cards";
import "./NeoBrutalistCardsSection.css";

const NeoBrutalistCardsSection = () => (
  <section id="how-it-works" className="py-16 px-4 overflow-hidden">
    <h2 className="neo-brutalist-cards-section__heading text-center text-3xl md:text-4xl text-neutral-900 dark:text-white mb-12 tracking-tight">
      How it works
    </h2>
    <div className="max-w-[980px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-10 sm:gap-16 relative px-4">
      <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-black -translate-y-1/2 z-0 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-transparent via-black to-transparent animate-line-flow" />
      </div>
      <div className="sm:hidden absolute top-0 bottom-0 left-1/2 w-1 bg-black -translate-x-1/2 z-0 overflow-hidden">
        <div className="w-full bg-gradient-to-b from-transparent via-black to-transparent animate-line-flow-vertical" />
      </div>
      {neoBrutalistCards.map((card) => (
        <div key={card.id} className="flex-1 flex justify-center">
          <NeoBrutalistCard
            head={card.head}
            content={card.content}
            buttonText={card.buttonText}
          />
        </div>
      ))}
    </div>
  </section>
);

export default NeoBrutalistCardsSection;
