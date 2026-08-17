import Image from "next/image";
import Link from "next/link";
import { DailyHealthReports } from "@/components/daily-health-reports";
import { getCurrentUser } from "@/lib/auth";

const features = [
  {
    number: "01",
    title: "Understand external reports",
    description:
      "Upload a supported blood-report PDF and review recognized results with clear range checks and educational context.",
    href: "/reports",
    linkLabel: "Explore report analysis",
  },
  {
    number: "02",
    title: "Follow your daily progress",
    description:
      "Bring steps, water, meals, exercise, sleep routines, and healthy habits into one calm daily view.",
    href: "/health-tracker",
    linkLabel: "Open health tracker",
  },
  {
    number: "03",
    title: "See the story over time",
    description:
      "Search daily wellness reports, compare consistency scores, and understand whether your recorded habits are improving.",
    href: "/daily-health-reports",
    linkLabel: "View daily reports",
  },
  {
    number: "04",
    title: "Find care around you",
    description:
      "Search separately for nearby hospitals, clinics, doctors, and pharmacies when you need in-person support.",
    href: "/nearby",
    linkLabel: "Find nearby care",
  },
];

const healthMessages = [
  "Small, repeatable choices can shape meaningful change.",
  "Your numbers should guide curiosity—never fear.",
  "Progress becomes easier to see when you record it.",
];

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <main className="page-shell home-page">
      <section className="hero home-hero">
        <div className="home-hero-copy">
          <div className="home-hero-kicker">
            <span aria-hidden="true" />A calmer way to understand your health
          </div>
          <h1>
            Turn health data into
            <span> everyday clarity.</span>
          </h1>
          <p className="lead">
            Understand external lab reports, track daily habits, follow your progress, and
            find nearby care—all in one private health companion.
          </p>
          <div className="hero-actions">
            <Link
              className="button home-primary-action"
              href={user ? "/health-tracker" : "/signup"}
            >
              {user ? "Continue my health journey" : "Start my health journey"}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              className="button button-secondary"
              href={user ? "/reports/upload" : "/login"}
            >
              {user ? "Analyze a report" : "I already have an account"}
            </Link>
          </div>
          <div className="trust-row" aria-label="Platform benefits">
            <span>Private local records</span>
            <span>Clear daily trends</span>
            <span>Educational guidance</span>
          </div>
        </div>

        <div className="home-hero-visual" aria-label="3D health and wellness dashboard">
          <div className="home-orbit home-orbit-one" aria-hidden="true" />
          <div className="home-orbit home-orbit-two" aria-hidden="true" />
          <Image
            className="hero-art"
            src="/images/health-journey-3d.png"
            width={768}
            height={512}
            sizes="(max-width: 760px) 100vw, 48vw"
            alt="3D wellness scene with a heart, activity chart, water droplet, fruit, and health report"
            priority
          />
          <div className="home-floating-card home-floating-card-top">
            <span>Daily rhythm</span>
            <strong>Track · Learn · Improve</strong>
          </div>
          <div className="home-floating-card home-floating-card-bottom">
            <i aria-hidden="true">✓</i>
            <span>
              <strong>One clear view</strong>
              Reports and routines together
            </span>
          </div>
        </div>
      </section>

      <section className="home-message-strip" aria-labelledby="health-notes-title">
        <div>
          <p className="eyebrow">A healthier rhythm</p>
          <h2 id="health-notes-title">Gentle reminders for the journey</h2>
        </div>
        <div className="home-message-grid">
          {healthMessages.map((message, index) => (
            <blockquote key={message}>
              <span aria-hidden="true">0{index + 1}</span>
              <p>“{message}”</p>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="home-feature-section" aria-labelledby="home-features-title">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Everything connected</p>
            <h2 id="home-features-title">A clearer picture of your everyday health</h2>
          </div>
          <p>
            From one lab value to a month of daily habits, each tool helps you understand
            context without pretending to replace professional care.
          </p>
        </div>
        <div className="home-feature-grid">
          {features.map((feature) => (
            <article className="home-feature-card" key={feature.number}>
              <span className="home-feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <Link href={user ? feature.href : "/signup"}>
                {feature.linkLabel} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="home-journey-card" aria-labelledby="journey-title">
        <div className="home-journey-intro">
          <p className="eyebrow">Your next healthy step</p>
          <h2 id="journey-title">Start with what you know today.</h2>
          <p>
            Add a report or record one habit. The dashboard turns those small entries into
            a useful daily view and a trend you can revisit.
          </p>
          <Link className="button" href={user ? "/daily-health-reports" : "/signup"}>
            {user ? "See my progress" : "Create my private space"}
          </Link>
        </div>
        <div className="home-journey-steps">
          <div>
            <span>1</span>
            <strong>Record</strong>
            <p>Save a report, activity, meal, drink, workout, or daily routine.</p>
          </div>
          <div>
            <span>2</span>
            <strong>Understand</strong>
            <p>Review plain-language context, progress markers, and safe suggestions.</p>
          </div>
          <div>
            <span>3</span>
            <strong>Keep going</strong>
            <p>Use searchable daily reports and trends to notice consistent habits.</p>
          </div>
        </div>
      </section>

      <section className="home-closing-message">
        <span aria-hidden="true">✦</span>
        <blockquote>
          “Health is not a perfect score. It is the practice of noticing, learning, and
          choosing your next caring step.”
        </blockquote>
        <p>Use your records as a conversation starter with a qualified clinician.</p>
      </section>

      {user && (
        <section
          className="home-daily-dashboard"
          aria-label="Your daily health dashboard"
        >
          <DailyHealthReports />
        </section>
      )}
    </main>
  );
}
