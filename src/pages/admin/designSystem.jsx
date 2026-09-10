import { useState } from "react";
import {
  Page, H1, H2, Card, Btn, Banner, Tag, Bar, Ring, Stat, Input, Area, Sel, Field, Switch, CheckRow,
  Empty, Modal, ConfirmDialog, Tabs, DatePicker, DateRangePicker, Lbl,
} from "../../design/primitives.jsx";
import { C, FONT } from "../../design/tokens.js";
import { I } from "../../design/icons.jsx";

/* Design-system reference. The tracker's finding was that the ~44 primitives in
   design/primitives.jsx had no prop-shape documentation - every call site was reverse-
   engineering from another call site. This page renders each primitive with its real props and
   a small usage sample, wired to actual state so hover/click/disabled all show what the caller
   would see. It is not a full Storybook (that would be a whole separate build) - it is the
   in-app reference for people extending the design system, kept next to the running code so
   it can't drift the way an external documentation site inevitably would. */

function Section({name,summary,children}){
  return <Card style={{marginBottom:16}}>
    <div className="flex justify-between items-baseline flex-wrap gap-2 mb-2">
      <div><H2 style={{margin:0}}>{name}</H2></div>
    </div>
    <div className="text-sm text-text-2 mb-4 leading-relaxed">{summary}</div>
    <div className="flex flex-col gap-4">{children}</div>
  </Card>;
}

function Row({label,children,notes}){
  return <div className="border-t border-line-soft pt-4">
    <div className="flex gap-3 items-start justify-between mb-2 flex-wrap">
      <div className="text-xs font-bold text-text-3 uppercase tracking-wider">{label}</div>
      {notes&&<div className="text-xs text-text-3 max-w-100 leading-snug">{notes}</div>}
    </div>
    <div>{children}</div>
  </div>;
}

function Code({children}){
  return <pre className="bg-bg border border-line rounded-lg py-2.5 px-3 my-2 text-xs overflow-x-auto"
    style={{fontFamily:"ui-monospace, SFMono-Regular, Consolas, monospace"}}>{children}</pre>;
}

export function AdmDesignSystem(){
  const [modalOpen,setModalOpen]=useState(false);
  const [confirmOpen,setConfirmOpen]=useState(false);
  const [tab,setTab]=useState("one");
  const [sw,setSw]=useState(true);
  const [chk,setChk]=useState(false);
  const [text,setText]=useState("");
  const [d,setD]=useState(""); const [range,setRange]=useState({from:"",to:""});
  const [inv,setInv]=useState(false);

  return <Page narrow>
    <H1 sub="Every design-system primitive, its props, and a live example. This is the in-app source of truth for building on top of the design system - if you're about to reach for a raw div, check here first.">Design system</H1>

    <Banner tone="brand" icon="book" title="How to read this page" style={{marginBottom:20}}>
      Each section is one primitive exported from <code className="bg-white border border-line rounded px-1.5 py-0.5 text-xs">src/design/primitives.jsx</code>. The live example is the real component with real state; the code sample beneath is the minimal call. Props not shown are optional.
    </Banner>

    <Section name="Btn" summary="Primary button. Handles primary/outline/ghost/ok/danger/onDark variants, four sizes, icon slots (left/right), and full-width. Loading state disables the button and swaps the label.">
      <Row label="Kinds" notes="primary is the default. onDark is for dark surfaces (sidebars, hero panels).">
        <div className="flex gap-2 flex-wrap items-center">
          <Btn>Primary</Btn>
          <Btn kind="outline">Outline</Btn>
          <Btn kind="ghost">Ghost</Btn>
          <Btn kind="ok" icon="check">Confirm</Btn>
          <Btn kind="danger" icon="trash">Delete</Btn>
          <Btn disabled>Disabled</Btn>
          <Btn loading>Saving…</Btn>
        </div>
      </Row>
      <Row label="Sizes"><div className="flex gap-2 items-center">
        <Btn size="xs">XS</Btn><Btn size="sm">SM</Btn><Btn size="md">MD</Btn><Btn size="lg">LG</Btn>
      </div></Row>
      <Code>{`<Btn kind="primary" size="md" icon="check" onClick={fn}>Save</Btn>
<Btn kind="outline" full disabled loading>Deleting…</Btn>`}</Code>
    </Section>

    <Section name="Tag" summary="Small status pill. Six tones plus 'onDark'; icon optional; sm shrinks to a compact chip.">
      <Row label="Tones"><div className="flex gap-2 flex-wrap">
        <Tag>Neutral</Tag><Tag tone="brand">Brand</Tag><Tag tone="ok">OK</Tag>
        <Tag tone="warn">Warn</Tag><Tag tone="danger">Danger</Tag><Tag tone="violet">Violet</Tag>
        <Tag icon="check" tone="ok">With icon</Tag><Tag sm>Small</Tag>
      </div></Row>
      <Code>{`<Tag tone="ok" icon="check">Verified</Tag>
<Tag tone="danger" sm>Overdue</Tag>`}</Code>
    </Section>

    <Section name="Card" summary="Rounded container with soft shadow. `pad` sets inner padding (default 24). `hover` adds hover elevation. `onClick` makes it button-like.">
      <Row label="Default"><Card pad={20}>Card contents.</Card></Row>
      <Row label="Interactive"><Card pad={20} hover onClick={()=>{}}>Hover me — click behaves like a button.</Card></Row>
      <Code>{`<Card pad={24} hover onClick={fn}>...</Card>`}</Code>
    </Section>

    <Section name="Banner" summary="Full-width callout. Tone drives colour and icon. `title` above `children`; optional `action` slot on the right; optional `onClose`.">
      <Row label="Tones">
        <Banner tone="brand" icon="info" title="Brand" style={{marginBottom:8}}>Announcement.</Banner>
        <Banner tone="ok" icon="check" title="Success" style={{marginBottom:8}}>Everything worked.</Banner>
        <Banner tone="warn" icon="alert" title="Attention" style={{marginBottom:8}}>Fix this before continuing.</Banner>
        <Banner tone="danger" icon="alert" title="Error" action={<Btn kind="ghost" size="sm">Retry</Btn>}>Something broke.</Banner>
      </Row>
      <Code>{`<Banner tone="warn" icon="alert" title="Attention">Fix this.</Banner>`}</Code>
    </Section>

    <Section name="Stat" summary="Big-number tile with label, icon and delta. Clickable with `onClick`. Tone accents the value colour.">
      <Row label="Examples"><div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
        <Stat icon="users" label="Job seekers" value="12,481" tone={C.brand}/>
        <Stat icon="briefcase" label="Live jobs" value="342" delta="+18 this week" tone={C.ok}/>
        <Stat icon="wallet" label="MRR" value="$18.4k" tone={C.violet}/>
      </div></Row>
      <Code>{`<Stat icon="users" label="Job seekers" value={n} tone={C.brand} onClick={fn}/>`}</Code>
    </Section>

    <Section name="Input / Area / Sel / Field" summary="Form controls. `Input` handles single-line text with optional icon, suffix and invalid state. `Area` is the multi-line variant. `Sel` wraps native <select>. `Field` binds a label, hint and error together.">
      <Row label="Input"><div className="grid gap-3" style={{gridTemplateColumns:"1fr 1fr"}}>
        <Input placeholder="Plain" value={text} onChange={e=>setText(e.target.value)}/>
        <Input icon="search" placeholder="With icon"/>
        <Input invalid={inv} onFocus={()=>setInv(true)} onBlur={()=>setInv(false)} placeholder="Invalid state on focus"/>
        <Input type="password" placeholder="Password"/>
      </div></Row>
      <Row label="Area"><Area rows={3} placeholder="Multi-line"/></Row>
      <Row label="Sel"><Sel><option>Option A</option><option>Option B</option></Sel></Row>
      <Row label="Field wrapper"><Field label="Email address" hint="We never share it." error={inv?"Enter a valid email.":null} required>
        <Input placeholder="you@company.ca"/>
      </Field></Row>
      <Code>{`<Field label="Email" required error={err}><Input .../></Field>`}</Code>
    </Section>

    <Section name="Switch / CheckRow" summary="Switch is a compact toggle. CheckRow pairs it with a full-width label + sub-text row - what most preference panels want.">
      <Row label="Switch"><Switch on={sw} onChange={setSw}/></Row>
      <Row label="CheckRow"><CheckRow on={chk} onChange={setChk} label="Marketing emails" sub="Occasional news about new features and Canadian hiring insights."/></Row>
      <Code>{`<Switch on={value} onChange={setValue}/>
<CheckRow on={value} onChange={setValue} label="Enable" sub="Longer explanation."/>`}</Code>
    </Section>

    <Section name="Bar / Ring" summary="Small progress and score indicators. `Bar` is horizontal 0-100. `Ring` is a circular score with an optional centre label.">
      <Row label="Bar"><Bar v={72}/></Row>
      <Row label="Ring"><div className="flex gap-3"><Ring v={92} label="92"/><Ring v={68} label="68"/><Ring v={34} label="34" size={64}/></div></Row>
      <Code>{`<Bar v={72} tone={C.ok}/>
<Ring v={score} label={score} size={46}/>`}</Code>
    </Section>

    <Section name="Empty" summary="Empty-state placeholder. `icon`, `title`, `body` and an optional `action` button.">
      <Row label="Example"><Empty icon="briefcase" title="No jobs yet" body="Post a job to see applicants land here." action={<Btn size="sm">Post a job</Btn>}/></Row>
      <Code>{`<Empty icon="briefcase" title="No jobs" body="..." action={<Btn>...</Btn>}/>`}</Code>
    </Section>

    <Section name="Modal / ConfirmDialog" summary="Overlay dialogs. `Modal` is the general case with a header, body and footer slot; `ConfirmDialog` is the specialised destructive-action pattern with a fixed Cancel/Confirm pair.">
      <Row label="Trigger">
        <div className="flex gap-2 flex-wrap">
          <Btn onClick={()=>setModalOpen(true)}>Open Modal</Btn>
          <Btn kind="danger" onClick={()=>setConfirmOpen(true)}>Open ConfirmDialog</Btn>
        </div>
      </Row>
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Modal title" sub="One-line context under the title"
        footer={<><Btn kind="ghost" onClick={()=>setModalOpen(false)}>Cancel</Btn><Btn onClick={()=>setModalOpen(false)}>Save</Btn></>}>
        <div className="text-sm text-text-2">Any children go here.</div>
      </Modal>
      <ConfirmDialog open={confirmOpen} onClose={()=>setConfirmOpen(false)} onConfirm={()=>setConfirmOpen(false)}
        title="Delete this record?" confirmLabel="Delete">
        This can't be undone.
      </ConfirmDialog>
      <Code>{`<Modal open={open} onClose={close} title="Title" footer={<><Btn.../><Btn.../></>}>body</Modal>
<ConfirmDialog open={o} onClose={c} onConfirm={c} title="..." confirmLabel="Delete">Warning.</ConfirmDialog>`}</Code>
    </Section>

    <Section name="Tabs" summary="Segmented tab control. Items is [{k,label,icon?}]; value is the currently active k; onChange fires with a new k.">
      <Row label="Example"><Tabs items={[{k:"one",label:"One"},{k:"two",label:"Two"},{k:"three",label:"Three"}]} value={tab} onChange={setTab}/></Row>
      <Code>{`<Tabs items={[{k:"a",label:"A"},{k:"b",label:"B"}]} value={tab} onChange={setTab}/>`}</Code>
    </Section>

    <Section name="DatePicker / DateRangePicker" summary="DatePicker wraps a native date input with icon; DateRangePicker exposes a from/to pair with the ordering rule enforced and quick presets (Last 7d, YTD, etc.) that resolve at click time so they never go stale.">
      <Row label="DatePicker"><DatePicker value={d} onChange={setD}/></Row>
      <Row label="DateRangePicker"><DateRangePicker from={range.from} to={range.to} onChange={setRange}/></Row>
      <Code>{`<DatePicker value={d} onChange={setD}/>
<DateRangePicker from={range.from} to={range.to} onChange={setRange}/>`}</Code>
    </Section>

    <Section name="Typography helpers" summary="H1 and H2 are page titles with an optional sub-line and action slot; Lbl is the small uppercase form-section label used above input clusters.">
      <Row label="H1"><H1 sub="Sub-line goes here" action={<Btn size="sm">Action</Btn>}>Page title</H1></Row>
      <Row label="H2"><H2 sub="Section sub-line">Section title</H2></Row>
      <Row label="Lbl"><Lbl>Section group label</Lbl><Input placeholder="First input in the group"/></Row>
      <Code>{`<H1 sub="Subtitle" action={<Btn>Action</Btn>}>Title</H1>
<Lbl>Section label</Lbl>`}</Code>
    </Section>

    <Section name="Icons (I)" summary="Every icon is one exported name. Look up in src/design/icons.jsx; the reference below lists the frequently-used names. `s` is the size in pixels (default 18); `c` overrides the currentColor.">
      <Row label="Frequently used"><div className="flex flex-wrap gap-3 items-center">
        {["home","user","users","building","briefcase","mail","phone","calendar","clock","wallet","file","book","cap","gear","trend","activity","shield","lock","alert","check","plus","x","trash","edit","search","filter","copy","download","upload","externalLink","bell","chevR","chevL","chevD","chevU","truck","tool","factory","pulse","cart","chef","globe","leaf","sparkle","eye","logout"].map(n=>
          <div key={n} className="flex items-center gap-1.5 border border-line rounded-lg py-1.5 px-2.5" title={n}>
            <I n={n} s={16}/><span className="text-xs text-text-3">{n}</span>
          </div>)}
      </div></Row>
      <Code>{`<I n="check" s={16} c={C.ok}/>`}</Code>
    </Section>

    <Section name="Palette" summary="Design tokens from src/design/tokens.js (mirrored into src/index.css as @theme). Use these classes/vars rather than raw hex - a token can change once and every consumer follows.">
      <Row label="Colours"><div className="grid gap-2" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))"}}>
        {[["brand","bg-brand text-white"],["accent","bg-accent text-white"],["ok","bg-ok text-white"],["warn","bg-warn text-white"],["red","bg-red text-white"],["violet","bg-violet text-white"],["ink","bg-ink text-white"],["text","bg-text text-white"],["text-2","bg-text-2 text-white"],["text-3","bg-text-3 text-white"],["line","bg-line text-text"],["bg","bg-bg text-text border border-line"]].map(([n,cls])=>
          <div key={n} className={`${cls} py-3 px-3 rounded-lg text-xs font-mono`}>{n}</div>)}
      </div></Row>
      <Code>{`className="bg-brand text-white border-line"
color: var(--color-brand);`}</Code>
    </Section>
  </Page>;
}
