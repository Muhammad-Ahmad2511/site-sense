import { useEffect, useMemo, useState, useCallback } from 'react';
import { Layers, ClipboardList, Gauge, Sparkles, Blocks } from 'lucide-react';
import { useSession } from './hooks/useSession';
import { useAuditRun } from './hooks/useAuditRun';
import { useScrollSpy, scrollToSection } from './hooks/useScrollSpy';
import { useExpandedSections } from './hooks/useExpandedSections';
import { getStatus } from './services/auditService';

import AnimatedBackground from '@shared/components/AnimatedBackground';
import Navbar from './components/Navbar';
import LoadingOverlay from './components/LoadingOverlay';
import CollapsibleSection from './components/CollapsibleSection';
import SectionToolbar from './components/SectionToolbar';
import EmptyState from './components/EmptyState';
import Footer from './components/Footer';

import HeroSection from './sections/HeroSection';
import FeaturesSection from './sections/FeaturesSection';
import AuditResultsSection from './sections/AuditResultsSection';
import PerformanceSection from './sections/PerformanceSection';
import AiSummarySection from './sections/AiSummarySection';
import TechnologyStackSection from './sections/TechnologyStackSection';

const SECTION_META: Record<string, { title: string; icon: any }> = {
  'section-features': { title: 'Features', icon: Layers },
  'section-audit-results': { title: 'Audit Results', icon: ClipboardList },
  'section-performance': { title: 'Performance Insights', icon: Gauge },
  'section-ai-recommendations': { title: 'AI Recommendations', icon: Sparkles },
  'section-technology': { title: 'Technology Stack', icon: Blocks }
};
const SECTION_IDS = Object.keys(SECTION_META);

export default function App() {
  const { user, logout } = useSession();
  const [audit, setAudit] = useState<any>(null);
  const [aiConfigured, setAiConfigured] = useState(false);

  useEffect(() => {
    getStatus().then((data: any) => setAiConfigured(Boolean(data.aiConfigured)));
  }, []);

  const { phase, progress, error, run } = useAuditRun({
    onComplete: (result: any) => {
      setAudit(result);
      requestAnimationFrame(() => {
        setTimeout(() => scrollToSection('section-audit-results'), 150);
      });
    }
  });

  const allSectionIds = useMemo(() => ['section-home', ...SECTION_IDS, 'section-footer'], []);
  const activeId = useScrollSpy(allSectionIds);
  const { expanded, everExpanded, setSection, expandAll, collapseAll, expandAndScrollTo } = useExpandedSections(SECTION_IDS);

  const handleNavigate = useCallback(
    (id: string) => {
      if (SECTION_IDS.includes(id)) {
        expandAndScrollTo(id);
        return;
      }
      scrollToSection(id);
    },
    [expandAndScrollTo]
  );

  const handleRunAuditCta = useCallback(() => {
    scrollToSection('section-home');
    requestAnimationFrame(() => {
      setTimeout(() => document.getElementById('hero-url')?.focus(), 400);
    });
  }, []);

  const handleRecommendationChange = useCallback((findingId: string, value: string) => {
    setAudit((prev: any) => ({
      ...prev,
      findings: prev.findings.map((item: any) => (item.id === findingId ? { ...item, recommendation: value } : item))
    }));
  }, []);

  const handleApplyAiExplanations = useCallback((findingExplanations: any[]) => {
    if (!findingExplanations.length) return;
    const byId = new Map(findingExplanations.map((item) => [item.findingId, item]));
    setAudit((prev: any) => ({
      ...prev,
      findings: prev.findings.map((item: any) => {
        const match = byId.get(item.id);
        return match ? { ...item, aiExplanation: match.explanation, recommendation: match.refinedRecommendation } : item;
      })
    }));
  }, []);

  const isBusy = phase === 'starting' || phase === 'running';

  return (
    <div className="relative">
      <AnimatedBackground parallax />
      <Navbar
        hasResults={Boolean(audit)}
        activeId={activeId}
        onNavigate={handleNavigate}
        onRunAudit={handleRunAuditCta}
        user={user}
        onLogout={logout}
      />
      <LoadingOverlay active={isBusy} progress={progress} />

      <HeroSection onAnalyze={run} isBusy={isBusy} error={phase === 'failed' ? error : ''} />

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-[clamp(1rem,4vw,2rem)] pb-16">
        <SectionToolbar onExpandAll={expandAll} onCollapseAll={collapseAll} />

        {(() => {
          const meta = SECTION_META['section-features'];
          return (
            <CollapsibleSection
              id="section-features"
              icon={<meta.icon size={18} strokeWidth={2} />}
              title={meta.title}
              expanded={expanded['section-features']}
              everExpanded={everExpanded['section-features']}
              onToggle={(sectionId: string) => setSection(sectionId, !expanded[sectionId])}
            >
              <FeaturesSection />
            </CollapsibleSection>
          );
        })()}

        {(() => {
          const meta = SECTION_META['section-audit-results'];
          return (
            <CollapsibleSection
              id="section-audit-results"
              icon={<meta.icon size={18} strokeWidth={2} />}
              title={meta.title}
              subtitle={audit ? '' : 'Run an audit to unlock this section'}
              expanded={expanded['section-audit-results']}
              everExpanded={everExpanded['section-audit-results']}
              onToggle={(sectionId: string) => setSection(sectionId, !expanded[sectionId])}
            >
              {audit ? (
                <AuditResultsSection
                  audit={audit}
                  aiConfigured={aiConfigured}
                  onRecommendationChange={handleRecommendationChange}
                  onJumpToAiSummary={() => expandAndScrollTo('section-ai-recommendations')}
                />
              ) : (
                <EmptyState>
                  <button type="button" onClick={handleRunAuditCta} className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-300">
                    Run an audit
                  </button>{' '}
                  above to see audit results.
                </EmptyState>
              )}
            </CollapsibleSection>
          );
        })()}

        {(() => {
          const meta = SECTION_META['section-performance'];
          return (
            <CollapsibleSection
              id="section-performance"
              icon={<meta.icon size={18} strokeWidth={2} />}
              title={meta.title}
              subtitle={audit ? '' : 'Run an audit to unlock this section'}
              expanded={expanded['section-performance']}
              everExpanded={everExpanded['section-performance']}
              onToggle={(sectionId: string) => setSection(sectionId, !expanded[sectionId])}
            >
              {audit ? (
                <PerformanceSection audit={audit} onRecommendationChange={handleRecommendationChange} />
              ) : (
                <EmptyState>
                  <button type="button" onClick={handleRunAuditCta} className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-300">
                    Run an audit
                  </button>{' '}
                  above to see performance insights.
                </EmptyState>
              )}
            </CollapsibleSection>
          );
        })()}

        {(() => {
          const meta = SECTION_META['section-ai-recommendations'];
          return (
            <CollapsibleSection
              id="section-ai-recommendations"
              icon={<meta.icon size={18} strokeWidth={2} />}
              title={meta.title}
              subtitle={audit ? '' : 'Run an audit to unlock this section'}
              expanded={expanded['section-ai-recommendations']}
              everExpanded={everExpanded['section-ai-recommendations']}
              onToggle={(sectionId: string) => setSection(sectionId, !expanded[sectionId])}
            >
              {audit ? (
                <AiSummarySection audit={audit} aiConfigured={aiConfigured} onApplyAiExplanations={handleApplyAiExplanations} />
              ) : (
                <EmptyState>
                  <button type="button" onClick={handleRunAuditCta} className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-300">
                    Run an audit
                  </button>{' '}
                  above to see AI recommendations.
                </EmptyState>
              )}
            </CollapsibleSection>
          );
        })()}

        {(() => {
          const meta = SECTION_META['section-technology'];
          return (
            <CollapsibleSection
              id="section-technology"
              icon={<meta.icon size={18} strokeWidth={2} />}
              title={meta.title}
              expanded={expanded['section-technology']}
              everExpanded={everExpanded['section-technology']}
              onToggle={(sectionId: string) => setSection(sectionId, !expanded[sectionId])}
            >
              <TechnologyStackSection />
            </CollapsibleSection>
          );
        })()}
      </main>

      <Footer />
    </div>
  );
}
