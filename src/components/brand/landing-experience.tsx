"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { photoForDish } from "@/lib/photo-library";
import Link from "next/link";
import { MotionScene } from "@/components/layout/motion-scene";
import { ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, Coffee, Flame, HandHeart, Leaf, Link2, Minus, Plus, ShoppingBag, Soup, TreePine, Users, Utensils, Vote } from "lucide-react";

const formats = [
  { label: "Dinner", icon: Utensils, title: "Saturday supper", dish: "chickpea-curry", food: "Chickpea curry", note: "Something for everyone at the table." },
  { label: "Hotpot", icon: Soup, title: "Hotpot at ours", dish: "mushroom-hotpot-broth", food: "Mushroom hotpot", note: "Pick a broth. Gather your favorite people." },
  { label: "Potluck", icon: HandHeart, title: "Bring a little something", dish: "vegetarian-pasta-bake", food: "Vegetarian pasta bake", note: "Everyone brings a dish. Everything comes together." },
  { label: "BBQ", icon: Flame, title: "Backyard barbecue", dish: "bbq-chicken-skewers", food: "Chicken skewers", note: "Fire up the grill. We’ll sort the rest." },
  { label: "Picnic", icon: TreePine, title: "Lunch in the sunshine", dish: "picnic-lentil-wraps", food: "Vegetable picnic wraps", note: "A blanket, a basket, and a shared plan." },
  { label: "Brunch", icon: Coffee, title: "A slow Sunday brunch", dish: "brunch-avocado-bean-toast", food: "Avocado toast", note: "Make room for a slower kind of morning." }
];
const steps = [
  { title: "Make room for everyone.", text: "One link brings your people together. Get their favorites, dietary needs, and allergies in one place.", icon: Users },
  { title: "Find a menu you all love.", text: "Compare complete menus that fit the group. Everyone gets a vote, so choosing dinner feels easy.", icon: Vote },
  { title: "A shared list. A lighter lift.", text: "Turn your menu into a shopping list. Split the groceries or claim a whole dish for the potluck.", icon: ShoppingBag }
];
const faq = [
  ["Do my guests need an account?", "No. Share your room’s invitation link and guests can add their meal preferences. You can also start hosting with a guest account."],
  ["Can I plan around allergies and dietary needs?", "Yes. Guests can share allergies, dietary preferences, likes, dislikes, and spice tolerance. TableSync uses those details when suggesting menus and explains conflicts when a suitable plan can’t be found."],
  ["How does the shared shopping list work?", "Once you choose a menu, ingredients are combined into a shared list. Assign groceries, let guests claim items, and mark them purchased. For potlucks, people can also claim whole dishes."],
  ["How long does a gathering stay available?", "Rooms expire seven days after creation. Guest host access stays in the current browser; clearing cookies or ending that session removes access unless you have linked your hosted rooms to GitHub."]
];

export function LandingExperience({ primaryAction, createHref }: { primaryAction: ReactNode; createHref: string }) {
  const [format, setFormat] = useState(0);
  const [step, setStep] = useState(1);
  const [liked, setLiked] = useState(false);
  const [checked, setChecked] = useState<string[]>(["Coconut milk"]);
  const story = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 900px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const setup = () => {
      observer?.disconnect();
      if (!desktop.matches || reduced.matches || !story.current) return;
      observer = new IntersectionObserver(entries => {
        const preview = story.current?.parentElement?.querySelector(".product-preview");
        if (preview?.contains(document.activeElement)) return;
        entries.forEach(entry => {
          if (entry.isIntersecting) setStep(Number((entry.target as HTMLElement).dataset.step));
        });
      }, { rootMargin: "-30% 0px -45% 0px", threshold: 0 });
      story.current.querySelectorAll("[data-step]").forEach(element => observer?.observe(element));
    };
    setup();
    desktop.addEventListener("change", setup);
    reduced.addEventListener("change", setup);
    return () => {
      observer?.disconnect();
      desktop.removeEventListener("change", setup);
      reduced.removeEventListener("change", setup);
    };
  }, []);
  const active = formats[format];
  function toggleItem(item: string) { setChecked(current => current.includes(item) ? current.filter(x => x !== item) : [...current, item]); }
  return <MotionScene className="new-landing">
    <section className="gather-hero" aria-labelledby="gather-title">
      <div className="hero-edition"><span>THE ART OF GETTING TOGETHER</span><span>GOOD FOOD. ZERO GROUP-CHAT CHAOS.</span></div>
      <div className="gather-copy">
        <h1 id="gather-title"><span className="title-mask"><span>Good food.</span></span><span className="title-mask"><span>Better</span></span><span className="title-mask"><span className="hero-italic">company.</span></span></h1>
        <p>Bring everyone to the table. Find a menu you all love, share the shopping, and get back to the good part.</p>
        <div className="gather-actions">{primaryAction}<Link className="text-link" href="/preview">Take a look around <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        <span className="gather-reassurance"><CheckCheck size={18} aria-hidden="true" /> Start as a guest. Invite anyone.</span>
      </div>
      <div className="gather-visual">
        <div className="hero-photo-reveal"><div className="hero-photo-drift" data-drift=".065"><Image className="gather-photo" src={photoForDish("shared-table").src} alt={photoForDish("shared-table").alt} width={1400} height={933} priority sizes="(max-width: 760px) 100vw, 52vw" /></div></div>
        <div className="gather-photo-note"><span>Come hungry.<br />Leave happy.</span><Utensils size={25} strokeWidth={1.5} aria-hidden="true" /></div>
        <Link className="gather-invitation" href="/preview">
          <span className="invite-day"><small>SAT</small><strong>19</strong></span>
          <span><strong>Saturday supper</strong><small><span className="avatar-stack"><i>J</i><i>A</i><i>M</i></span> 6 friends · One shared plan</small><span className="sample-label">Example gathering</span></span>
          <ArrowUpRight size={19} aria-hidden="true" />
        </Link>
      </div>
      <a className="hero-scroll" href="#occasion-title"><span>THERE’S ALWAYS A REASON</span><ArrowRight size={17} aria-hidden="true"/></a>
    </section>

    <section className="occasion-section" aria-labelledby="occasion-title">
      <div className="occasion-intro" data-reveal><span className="editorial-label">01 / PICK YOUR KIND OF GOOD TIME</span><h2 id="occasion-title">Your people.<br /><em>Your kind of table.</em></h2><p>Big occasions. Just-because dinners. There’s a plan for all of them.</p></div>
      <div className="occasion-options" aria-label="Choose a gathering format">{formats.map(({label,icon:Icon},index) => <button key={label} className={format===index?"occasion-option active":"occasion-option"} aria-pressed={format===index} onClick={()=>setFormat(index)}><Icon size={25} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></button>)}</div>
      <div className="occasion-stage" data-reveal="photo">
        <div className="occasion-stage-copy" key={active.label}><span className="editorial-label">ON THE TABLE / {active.label.toUpperCase()}</span><h3>{active.title}</h3><p>{active.note}</p><Link className="text-link" href={createHref}>Make it a plan <ArrowUpRight size={20} aria-hidden="true"/></Link></div>
        <div className="occasion-dish" key={active.dish}><Image src={photoForDish(active.dish).src} alt={photoForDish(active.dish).alt} width={512} height={512} sizes="(max-width:760px) 80vw, 430px"/><span className="dish-caption">{active.food}</span></div>
        <span className="occasion-counter" aria-hidden="true">0{format+1}<small> / 06</small></span>
      </div>
    </section>

    <section className="how-section" id="how-it-works" aria-labelledby="how-title">
      <div className="how-intro" data-reveal><span className="editorial-label">02 / LESS ORGANIZING. MORE LIVING.</span><h2 id="how-title">From the group chat.<br /><em>To the good part.</em></h2><p>Three little steps. A whole lot to look forward to.</p></div>
      <div className="how-content">
        <div className="how-steps" ref={story} aria-label="Explore the planning steps">{steps.map(({title,text,icon:Icon},index)=><button key={title} data-step={index} aria-pressed={step===index} className={step===index?"how-step active":"how-step"} onClick={()=>setStep(index)}><span className="step-index">0{index+1}</span><span><strong>{title}</strong><span>{text}</span></span><Icon size={22} aria-hidden="true" /></button>)}</div>
        <div className="product-preview" aria-label="Interactive example gathering">
          <div className="preview-window-bar"><span><span className="mini-brand"><Utensils size={14} aria-hidden="true" /></span> TableSync</span><span className="sample-label">Interactive example</span></div>
          <div className="preview-window-body">
            <div className="mini-heading"><div><h3>{active.title}</h3><p>{active.note}</p></div><span className="mini-guest-count"><Users size={16} aria-hidden="true" />6</span></div>
            <div className="mini-tabs" aria-label="Example sections">{["People","Menu","Shopping"].map((label,i)=><button key={label} aria-pressed={step===i} onClick={()=>setStep(i)}>{label}</button>)}</div>
            <div className="mini-panel" key={step+"-"+format}>
            {step===0?<div className="mini-people">{[["J","Jamie","Hosting · Loves to cook"],["A","Alex","Vegetarian · Bringing groceries"],["M","Morgan","No peanuts · Mild spice"]].map(([initial,name,note])=><div key={name}><span className="person-avatar">{initial}</span><span><strong>{name}</strong><small>{note}</small></span><Check size={18} aria-label="Preferences shared" /></div>)}<div className="mini-note"><Link2 size={16} aria-hidden="true" /> One invitation. Everyone’s preferences.</div></div>:null}
            {step===1?<div className="mini-menu"><Image src={photoForDish(active.dish).src} width={512} height={512} alt={photoForDish(active.dish).alt} sizes="220px" /><div><span className="pill green"><Leaf size={12} aria-hidden="true" /> Made for your group</span><h4>{active.food}</h4><p>Part of a complete menu, with sides and something sweet.</p><button className={liked?"mini-vote voted":"mini-vote"} aria-pressed={liked} onClick={()=>setLiked(!liked)}><Vote size={16} aria-hidden="true" />{liked?"You’re in!":"I like this menu"}<span>{liked?5:4}</span></button></div></div>:null}
            {step===2?<div className="mini-shopping"><div className="mini-shopping-heading"><strong>Shared grocery list</strong><span>{checked.length} of 3 ready</span></div>{["Coconut milk","Fresh vegetables","Jasmine rice"].map((item,i)=><label key={item} className={checked.includes(item)?"is-checked":""}><input type="checkbox" checked={checked.includes(item)} onChange={()=>toggleItem(item)} /><span>{item}</span><small>{["Jamie","Alex","Morgan"][i]}</small></label>)}<p className="mini-note"><ShoppingBag size={16} aria-hidden="true" /> A little help from everyone.</p></div>:null}
            </div>
          </div>
          <Link className="preview-window-footer" href="/preview">Explore the full gathering <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
    <section className="gather-promise" data-reveal="photo">
      <div className="promise-photo"><Image src={photoForDish("brunch-avocado-bean-toast").src} width={512} height={512} alt={photoForDish("brunch-avocado-bean-toast").alt} sizes="(max-width: 760px) 70vw, 380px" /></div>
      <div className="promise-copy"><h2>A seat for every taste.</h2><p>The vegetarian. The spice lover. The friend who always brings dessert. Good gatherings make room for all of them.</p><ul><li><Check size={18} aria-hidden="true" /> Dietary needs considered from the start</li><li><Check size={18} aria-hidden="true" /> Menus shaped around your group and budget</li><li><Check size={18} aria-hidden="true" /> Everyone gets a say, and a way to help</li></ul><Link className="text-link" href="/preview?tab=people">Meet your example table <ArrowRight size={17} aria-hidden="true" /></Link></div>
    </section>
    <section className="gather-faq" data-reveal aria-labelledby="faq-title"><div><span className="editorial-label">THE LITTLE DETAILS</span><h2 id="faq-title">Before you<br /><em>pull up a chair.</em></h2></div><div>{faq.map(([q,a])=><details key={q}><summary>{q}<Plus className="faq-plus" size={18} aria-hidden="true"/><Minus className="faq-minus" size={18} aria-hidden="true"/></summary><p>{a}</p></details>)}</div></section>
    <section className="gather-final" data-reveal><span className="editorial-label">A LITTLE PLAN. A GREAT EVENING.</span><div><h2>See you<br /><em>at the table.</em></h2><Link className="button" href={createHref}>Let’s make a plan <ChevronRight size={19} aria-hidden="true" /></Link></div><span className="final-wordmark" aria-hidden="true">TableSync</span></section>
  </MotionScene>;
}
