import { Link } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Sparkles,
  Inbox,
  ArrowRight,
  Clock3,
  ShieldCheck,
  FileStack,
  Wand2,
  Check,
} from "lucide-react";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background desk-surface">
      <div className="accent-strip fixed left-0 top-0 z-50 w-full" />

      {/* Public header — not the filing drawer */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="mx-auto max-w-[1160px] px-6 h-[56px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mail className="size-4" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Helpdesk
              </span>
              <span className="eyebrow !text-[9px] !tracking-[0.14em] opacity-60">Correspondence</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#preview" className="hover:text-foreground transition-colors">Sorting room</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="rounded-full">
                  Open dashboard <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm" className="rounded-full">
                    Sign in
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="sm" className="rounded-full">
                    Open the drawer <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO — thesis: the pile of student letters */}
      <section className="mx-auto max-w-[1160px] px-6 pt-10 md:pt-14 pb-8">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-start">
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="stamp stamp-open !rotate-0 !py-1">Live sorting</span>
              <span className="eyebrow">Resolves 62% without a clerk</span>
            </div>

            <h1
              className="text-[34px] md:text-[44px] leading-[0.95] font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Every student email,
              <br />
              <span className="inline-flex items-center gap-3 flex-wrap">
                <span>answered like it</span>
                <span className="stamp stamp-open !text-[13px] md:!text-[15px] !px-3 !py-2 !rotate-[-1.5deg] animate-stamp-in">
                  mattered
                </span>
              </span>
            </h1>

            <p className="mt-4 text-[15px] leading-6 text-muted-foreground max-w-[48ch]">
              Helpdesk is a mailroom, not a ticket queue. Inbound emails become paper slips —
              AI classifies, drafts a human reply from your knowledge base, and files it.
              Agents handle the complex cases, not the copy-paste.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to={user ? "/dashboard" : "/login"}>
                <Button size="lg" className="rounded-full h-10 px-6">
                  {user ? "Go to sorting room" : "Start sorting — free"} <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#preview">
                <Button variant="outline" size="lg" className="rounded-full h-10">
                  See a filed ticket
                </Button>
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Resend inbound", "Knowledge base", "Postmark audit trail"].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                >
                  <Check className="size-3 text-success" /> {t}
                </span>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 max-w-[420px]">
              {[
                { k: "4.2h", l: "Avg resolve" },
                { k: "open → resolved", l: "Stamp trail" },
                { k: "100s", l: "Emails / day" },
              ].map((s) => (
                <div key={s.k} className="paper-sheet rounded-xl px-3 py-3">
                  <p className="text-sm font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                    {s.k}
                  </p>
                  <p className="eyebrow !normal-case !tracking-normal mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — the artifact: fanned ticket slips */}
          <div className="relative lg:sticky lg:top-[72px]">
            {/* desk */}
            <div className="paper-sheet rounded-2xl p-5 md:p-6">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Inbox — this morning</p>
                <span className="eyebrow !normal-case" style={{ fontFamily: "var(--font-mono)" }}>
                  06:42 · 18 new
                </span>
              </div>

              <div className="relative mt-4 h-[360px]">
                {/* slip 3 (bottom) */}
                <div className="absolute inset-x-0 top-0 paper-sheet rounded-xl border-l-[3px] category-stripe-technical p-4 rotate-[-1.2deg] translate-y-1">
                  <div className="flex items-center justify-between">
                    <span className="stamp stamp-category !rotate-0">Technical question</span>
                    <span className="eyebrow">02:14</span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-tight">Canvas won’t submit my final</p>
                  <p className="text-xs text-muted-foreground truncate">priya.nair@campus.edu · “I’ve tried 3 browsers…”</p>
                  <span className="stamp stamp-open !text-[9px] mt-3">Open</span>
                </div>
                {/* slip 2 */}
                <div className="absolute inset-x-0 top-[88px] paper-sheet rounded-xl border-l-[3px] category-stripe-refund p-4 rotate-[0.8deg] shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="stamp stamp-refund !rotate-0">Refund request</span>
                    <span className="eyebrow">04:51</span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-tight">Duplicate charge for Spring term</p>
                  <p className="text-xs text-muted-foreground truncate">m.chen@campus.edu · “Charged twice on Feb 12…”</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="stamp stamp-resolved !rotate-0">Resolved by AI</span>
                    <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                      KB §12 · refund window
                    </span>
                  </div>
                </div>
                {/* slip 1 (top, most recent) */}
                <div className="absolute inset-x-0 top-[176px] paper-sheet rounded-xl border-l-[3px] category-stripe-general p-4 rotate-[-0.6deg] shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="stamp stamp-category !rotate-0">General question</span>
                    <span className="eyebrow">06:39</span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-tight">Deadline extension for research stipend?</p>
                  <p className="text-xs text-muted-foreground truncate">j.owusu@campus.edu · “My advisor said to ask…”</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success border border-success/20 px-2 py-1 text-[10px] font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                      <Wand2 className="size-3" /> Draft ready
                    </span>
                    <span className="text-[11px] text-muted-foreground">Send or edit</span>
                  </div>
                </div>

                {/* brass clip */}
                <div className="absolute -right-2 top-2 size-8 rounded-full bg-accent border border-accent/30 shadow-sm grid place-items-center rotate-12">
                  <span className="size-3 rounded-full bg-background border border-border" />
                </div>
              </div>

              <div className="brass-rule my-4" />
              <div className="flex items-center justify-between text-xs">
                <span className="eyebrow flex items-center gap-1.5">
                  <Inbox className="size-3" /> Resend webhook → ticket in 1.2s
                </span>
                <span className="text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  3/{18} shown
                </span>
              </div>
            </div>

            {/* floating postmark */}
            <div className="hidden md:flex absolute -bottom-4 -left-4 paper-sheet rounded-full px-4 py-2 items-center gap-2 shadow-md rotate-[-1deg]">
              <span className="size-2 rounded-full bg-success animate-pulse" />
              <span className="eyebrow !text-foreground">Sorting clerk is on duty</span>
            </div>
          </div>
        </div>
      </section>

      {/* Proof bar — perforated ledger */}
      <section className="mx-auto max-w-[1160px] px-6">
        <div className="paper-sheet rounded-xl perforated-top px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <p className="eyebrow">Trusted as the campus mailroom</p>
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-success" /> Postmark audit trail
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-4 text-accent" /> Response in hours, not days
            </span>
            <span className="flex items-center gap-1.5">
              <FileStack className="size-4" /> Knowledge base grounded
            </span>
          </div>
        </div>
      </section>

      {/* How it works — mailroom sequence (01/02/03 is real order) */}
      <section id="how-it-works" className="mx-auto max-w-[1160px] px-6 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="text-2xl font-semibold mt-1" style={{ fontFamily: "var(--font-display)" }}>
              A short walk through the mailroom
            </h2>
          </div>
          <span className="hidden sm:inline-flex stamp stamp-category !rotate-0">Three hands off</span>
        </div>

        <div className="brass-rule my-6" />

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              n: "01",
              title: "Receive",
              desc: "Resend webhook delivers the email. We postmark it, strip the HTML safely, and file a ticket. No inbox polling.",
              stamp: "Inbound",
              icon: Inbox,
            },
            {
              n: "02",
              title: "Classify",
              desc: "AI reads the letter and stamps the category — general, technical, refund — and surfaces a summary. You stay in control.",
              stamp: "Stamped",
              icon: FileStack,
            },
            {
              n: "03",
              title: "Respond",
              desc: "A draft is written from your knowledge base. Polish with AI, send as yourself. 62% resolve without a hand touch.",
              stamp: "Sent",
              icon: Sparkles,
            },
          ].map((step) => (
            <div key={step.n} className="paper-sheet rounded-xl p-5 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">{step.n}</span>
                <span className="stamp stamp-category !rotate-0 !py-1 !text-[9px]">{step.stamp}</span>
              </div>
              <div className="mt-3 flex size-9 items-center justify-center rounded-lg bg-muted border border-border">
                <step.icon className="size-4" />
              </div>
              <h3 className="mt-3 text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.desc}</p>
              <div className="mt-4 br-dashed border-t border-dashed border-border pt-3 flex items-center gap-2 text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                <Check className="size-3 text-success" /> Logged
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Preview — sorting room ledger */}
      <section id="preview" className="mx-auto max-w-[1160px] px-6 pt-12">
        <div className="paper-sheet rounded-2xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary opacity-70" />
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-0">
            <div className="p-6 md:p-8">
              <p className="eyebrow">Sorting room preview</p>
              <h2 className="text-xl md:text-2xl font-semibold mt-1 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                A desk, not a dashboard. Built for speed, calm on the eyes.
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-6">
                Light paper by day, ink desk by night. Category stripes tell you what you’re holding before you
                read. Stamps replace pills — the status is impossible to miss.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: "Open", value: "42" },
                  { label: "Resolved by AI", value: "187" },
                  { label: "Avg", value: "4.2h" },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-border bg-muted/30 px-3 py-3">
                    <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                      {m.value}
                    </p>
                    <p className="eyebrow !normal-case !tracking-normal">{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/tickets">
                  <Button size="sm" variant="outline" className="rounded-full">
                    Peek at tickets <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="sm" className="rounded-full">
                    Open dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mock ledger — simplified table visual */}
            <div className="bg-muted/20 border-t lg:border-t-0 lg:border-l border-border p-4 md:p-6">
              <div className="paper-sheet rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
                  <span className="eyebrow">Tickets · sorted by postmark</span>
                  <span className="stamp stamp-open !rotate-0 !text-[9px] !py-1">Live</span>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { cat: "Refund", stripe: "category-stripe-refund", subject: "Duplicate charge — Spring term", sender: "m.chen@campus.edu", status: "Resolved" },
                    { cat: "Technical", stripe: "category-stripe-technical", subject: "Canvas submission failed", sender: "priya.nair@campus.edu", status: "Open" },
                    { cat: "General", stripe: "category-stripe-general", subject: "Stipend deadline extension", sender: "j.owusu@campus.edu", status: "Draft" },
                  ].map((row) => (
                    <div key={row.subject} className={`flex items-center gap-3 px-4 py-3 text-sm border-l-[3px] ${row.stripe} bg-card`}>
                      <span className="hidden sm:inline-flex stamp stamp-category !rotate-0 !text-[9px] !px-1.5 !py-1">{row.cat}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium truncate">{row.subject}</span>
                        <span className="block text-xs text-muted-foreground truncate">{row.sender}</span>
                      </span>
                      <span className={`stamp !text-[9px] !py-1 ${row.status === "Open" ? "stamp-open" : row.status === "Resolved" ? "stamp-resolved" : "stamp-category"}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-center text-[11px] text-muted-foreground mt-3" style={{ fontFamily: "var(--font-mono)" }}>
                Real ticket slips — hover to lift, press to open
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features — ledger cards */}
      <section id="features" className="mx-auto max-w-[1160px] px-6 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">What the clerk handles</p>
            <h2 className="text-2xl font-semibold mt-1" style={{ fontFamily: "var(--font-display)" }}>
              Human tone, machine filing
            </h2>
          </div>
          <span className="hidden md:inline-flex text-xs text-muted-foreground max-w-[32ch] text-right">
            Grounded in your knowledge base — no hallucinating fees, dates, or policy.
          </span>
        </div>

        <div className="brass-rule my-6" />

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: "AI summaries",
              desc: "One-line précis clipped to the top of each letter. Skim the pile, open only what needs you.",
              meta: "Summarize button → clerk’s summary",
            },
            {
              title: "Polished drafts",
              desc: "Type a rough reply, hit Polish — tone warmed, specifics kept, ready to send as yourself.",
              meta: "Wand → Send",
            },
            {
              title: "Grounded answers",
              desc: "Replies quote the knowledge base (§12, §8). Students get the right policy, not a guess.",
              meta: "KB §12 · refund window",
            },
            {
              title: "Filter the drawer",
              desc: "Search, status, and category — all server-filtered and sortable. The drawer remembers your sort.",
              meta: "Filter + sort + paginate",
            },
            {
              title: "Route & assign",
              desc: "Routing slip on every ticket. Assign, change category, close — stamped and logged.",
              meta: "Routing slip · paperclip",
            },
            {
              title: "Dark at night",
              desc: "Ink desk after hours. Same brass, same stamps — easy on the eyes for the late shift.",
              meta: "Light / Dark toggle",
            },
          ].map((f) => (
            <div key={f.title} className="paper-sheet rounded-xl p-5">
              <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-6 mt-1.5">{f.desc}</p>
              <p className="mt-4 text-[11px] text-muted-foreground border-t border-dashed border-border pt-3" style={{ fontFamily: "var(--font-mono)" }}>
                {f.meta}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — envelope fold */}
      <section className="mx-auto max-w-[1160px] px-6 pt-12 pb-10">
        <div className="paper-sheet rounded-2xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary opacity-70" />
          <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-6 p-6 md:p-8 items-center">
            <div>
              <p className="eyebrow">Start tonight</p>
              <h2 className="text-2xl font-semibold mt-1" style={{ fontFamily: "var(--font-display)" }}>
                Leave the pile to the clerk. Keep the replies that need you.
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-6 max-w-[50ch]">
                Sign in, connect Resend, seed the knowledge base. The next student email files itself and waits,
                stamped and ready, on the desk.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={user ? "/dashboard" : "/login"}>
                  <Button size="lg" className="rounded-full">
                    {user ? "Back to sorting room" : "Sign in to sort"} <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button size="lg" variant="outline" className="rounded-full">
                    How the mailroom works
                  </Button>
                </a>
              </div>
            </div>

            <div className="paper-sheet perforated-top rounded-xl p-4 bg-muted/20">
              <p className="eyebrow">For clerks & admins</p>
              <ul className="mt-3 space-y-2 text-sm">
                {["Admin invites agents", "Agents sort & send", "All actions postmarked"].map((li) => (
                  <li key={li} className="flex items-center gap-2">
                    <span className="size-5 rounded-full bg-success/10 border border-success/20 grid place-items-center text-success">
                      <Check className="size-3" />
                    </span>
                    {li}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                <Mail className="size-3" /> support@helpdesk — delivered
              </div>
            </div>
          </div>
          <div className="border-t border-dashed border-border px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span style={{ fontFamily: "var(--font-mono)" }}>© {new Date().getFullYear()} Helpdesk Correspondence · Sorting room, not a queue.</span>
            <span className="flex items-center gap-2">
              <span className="stamp stamp-category !rotate-0 !text-[9px]">Confidential</span>
              <span className="eyebrow !normal-case">Do not fold — perforate on line</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
