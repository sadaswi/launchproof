/*
 * Design direction: an experiment notebook for small developer-growth teams.
 * Feeling: clear and considered. Visual metaphor: a working research desk.
 * Source: self-designed around the verified funnel / evidence / decision flow;
 * the two official examples informed behavior, not their brands or layouts.
 * Signature: a numbered funnel beside a human decision, with provenance visible.
 * Style tile: warm paper + deep green; Georgia headings + system sans body;
 * light notebook theme; native type and charts; restrained state transitions;
 * short copy that separates observation from interpretation.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FlaskConical,
  Layers,
} from 'lucide-react'
import { Button, Badge } from '../components/ui'
import { Funnel } from '../components/Funnel'
import { demoExperiment } from '../lib/experiment'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

export default function Landing() {
  const [smallSample, setSmallSample] = useState(false)
  const example = demoExperiment()
  if (smallSample)
    example.counts = {
      visitors: 90,
      signups: 21,
      deployed: 5,
      realUse: 3,
      returned: 1,
      paid: 2,
    }
  return (
    <>
      <Seo {...seo} path="/" />
      <header className="landing-nav">
        <Link to="/" className="wordmark">
          <span className="brand-mark">
            <Check size={20} />
          </span>
          LaunchProof
        </Link>
        <span className="landing-nav-note">
          A notebook for better growth decisions.
        </span>
        <Link className="text-link" to="/home">
          Open workspace <ArrowUpRight size={16} />
        </Link>
      </header>
      <main className="landing-main" data-testid="static-landing">
        <section className="landing-intro">
          <div>
            <p className="eyebrow">
              <span className="tiny-square" /> SMALL TESTS. CLEAR NEXT STEPS.
            </p>
            <h1>
              Find out what
              <br />
              is worth doing <em>next.</em>
            </h1>
            <p className="landing-description">
              Put the hypothesis, the numbers, and the evidence in one place.
              Then make a growth decision you can explain.
            </p>
            <Link className="primary-link" to="/home">
              Start an experiment <ArrowRight size={17} />
            </Link>
            <p className="landing-caption">
              Sign in with DeepSpace. Your team can contribute live.
            </p>
          </div>
          <div className="notebook-note">
            <span className="note-number">01 / THE QUESTION</span>
            <p>
              Did people find value
              <br />
              after they signed up?
            </p>
            <div>
              <Layers size={18} />
              <span>
                A deployment is a beginning.
                <br />
                Track what happens afterward.
              </span>
            </div>
          </div>
        </section>
        <section className="landing-preview">
          <div className="preview-heading">
            <div>
              <p className="eyebrow">A LOOK INSIDE</p>
              <h2>From workshop to a useful app</h2>
              <p>One fictional cohort. A question worth following through.</p>
            </div>
            <Badge variant="outline">Synthetic demo</Badge>
          </div>
          <div className="preview-grid">
            <div>
              <Funnel experiment={example} />
              <div className="preview-controls">
                <FlaskConical size={15} />
                <span>Try the sample-size check.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSmallSample((v) => !v)}
                >
                  {smallSample
                    ? 'Show full demo cohort'
                    : 'Try a smaller cohort'}
                </Button>
              </div>
            </div>
            <aside className="preview-decision">
              <p className="eyebrow">02 / THE REASONING</p>
              <h3>
                {smallSample
                  ? 'Promising is not proven.'
                  : 'A signal worth another test.'}
              </h3>
              <p>
                {smallSample
                  ? 'Three of five deployments reached real use. That is 60%, but five deployments are below the planned minimum of twenty.'
                  : 'Fourteen of thirty-eight deployments reached another real user. The observed 36.8% clears our 30% threshold.'}
              </p>
              <div className="preview-quote">
                <span>OBSERVATION</span>
                <p>
                  {smallSample
                    ? 'The sample is too small for our own decision rule.'
                    : 'Only eight developers came back to improve their useful app.'}
                </p>
              </div>
              <div className="preview-quote">
                <span>STILL AN ASSUMPTION</span>
                <p>
                  A follow-up checklist might help builders return. The current
                  numbers do not tell us why they left.
                </p>
              </div>
              <div className="preview-next">
                <span className="eyebrow">THE NEXT SMALL TEST</span>
                <p>
                  Try a follow-up checklist with a new cohort and measure the
                  same path.
                </p>
              </div>
            </aside>
          </div>
        </section>
        <section className="landing-bottom">
          <h2>
            Keep the evidence.
            <br />
            Own the decision.
          </h2>
          <div>
            <p>
              Research public sources, invite a second perspective, and save an
              honest record of what you learned.
            </p>
            <Link className="text-link" to="/home">
              Open your experiment notebook <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>LaunchProof · Built by Sadaswi Talluru</span>
        <span>
          DeepSpace build exercise · All preview numbers are synthetic.
        </span>
      </footer>
    </>
  )
}
