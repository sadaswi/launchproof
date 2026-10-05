import { ArrowDown, ArrowUpRight } from 'lucide-react'
import {
  assess,
  formatCount,
  formatRate,
  percentage,
  stages,
} from '../lib/experiment'
import type { Experiment } from '../lib/experiment'

export function Funnel({ experiment }: { experiment: Experiment }) {
  const assessment = assess(experiment)
  const largest = Math.max(
    ...stages.map((s) => experiment.counts[s.key] ?? 0),
    1,
  )
  return (
    <section aria-label="Experiment funnel" className="funnel-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE PATH TO VALUE</p>
          <h2>What happened after the click?</h2>
        </div>
        <span className="small-muted">One cohort · unique people</span>
      </div>
      <div className="funnel-rows">
        {stages.map((stage, index) => {
          const value = experiment.counts[stage.key]
          const previous = index
            ? experiment.counts[stages[index - 1].key]
            : null
          return (
            <div className="funnel-row" key={stage.key}>
              <div className="funnel-label">
                <span className="stage-number">0{index + 1}</span>
                <span>{stage.label}</span>
              </div>
              <div className="funnel-track" aria-hidden="true">
                <div
                  className="funnel-fill"
                  style={{
                    width:
                      value === null
                        ? '0%'
                        : `${Math.max(2, (value / largest) * 100)}%`,
                  }}
                />
              </div>
              <strong>{formatCount(value)}</strong>
              <span className="funnel-rate">
                {index === 0
                  ? 'cohort'
                  : formatRate(percentage(value, previous))}
              </span>
            </div>
          )
        })}
      </div>
      <p className="small-muted funnel-footnote">
        <ArrowDown size={13} /> Each rate compares with the preceding stage.
        Blank means unmeasured; zero means measured with no results.
      </p>
      <div className="outcome-strip">
        <div>
          <span className="eyebrow">DEPLOYED → REAL USE</span>
          <strong>{formatRate(assessment.rate)}</strong>
          <span className="small-muted">
            Target {experiment.targetRate}% · min. {experiment.minSample}{' '}
            deployments
          </span>
        </div>
        <div>
          <span className="eyebrow">
            PAID DEVELOPERS <ArrowUpRight size={12} />
          </span>
          <strong>{formatCount(experiment.counts.paid)}</strong>
          <span className="small-muted">
            {formatRate(
              percentage(experiment.counts.paid, experiment.counts.signups),
            )}{' '}
            of signups · tracked separately
          </span>
        </div>
      </div>
      <div className={`assessment assessment-${assessment.state}`}>
        <strong>{assessment.label}</strong>
        <span>{assessment.detail}</span>
      </div>
    </section>
  )
}
