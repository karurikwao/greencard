import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle, FileText, Lightbulb, Search, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { categories, topics, type Topic } from '@/data/topics';
import { CONTENT_CLUSTERS, getClusterBySlug, getSupportingPageConfig, type PillarPageConfig, type SupportingPageConfig } from '@/lib/seo/clusters';
import { SITUATION_PAGES_CONFIG } from '@/lib/seo/expansion';

type PageShellProps = {
  title: string;
  description: string;
  onBack: () => void;
  children: ReactNode;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

function PageShell({ title, description, onBack, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="max-w-3xl mb-8">
          <Badge className="mb-3 bg-blue-100 text-blue-700 hover:bg-blue-100">USCIS Interview Prep</Badge>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">{title}</h1>
          <p className="mt-4 text-slate-600 leading-relaxed">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

function QuestionList({ topic, limit = 6 }: { topic: Topic; limit?: number }) {
  return (
    <div className="space-y-3">
      {topic.sampleQA.slice(0, limit).map((qa) => (
        <a
          key={qa.question}
          href={`/questions/${slugify(qa.question)}`}
          className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-slate-800">{qa.question}</p>
            <ArrowRight className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
          </div>
          {qa.tip && <p className="text-sm text-slate-500 mt-2">{qa.tip}</p>}
        </a>
      ))}
    </div>
  );
}

export function TopQuestionsPage({ onBack }: { onBack: () => void }) {
  const featuredTopics = topics.slice(0, 8);

  return (
    <PageShell
      title="Marriage Green Card Interview Questions"
      description="Practice common USCIS marriage interview questions by room, routine, relationship history, finances, family, and sensitive topics."
      onBack={onBack}
    >
      <div className="grid md:grid-cols-2 gap-5">
        {featuredTopics.map((topic) => (
          <Card key={topic.id} className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">{topic.title}</CardTitle>
              <CardDescription>{topic.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionList topic={topic} limit={3} />
              <a href={`/topics/${topic.id}`} className="inline-flex items-center mt-4 text-sm font-medium text-blue-600 hover:text-blue-700">
                View topic guide
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function QuestionDatabasePage({ onBack }: { onBack: () => void }) {
  return (
    <PageShell
      title="Immigration Interview Question Database"
      description="Browse the practice question library organized by topic so you can spot gaps, rehearse details, and prepare consistent answers with your spouse."
      onBack={onBack}
    >
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <Card className="border-slate-200 h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-500" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((category) => (
              <a key={category.id} href={`#${category.id}`} className="block text-sm text-slate-600 hover:text-blue-600">
                {category.name}
              </a>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-8">
          {categories.map((category) => {
            const categoryTopics = topics.filter((topic) => topic.category === category.id);
            return (
              <section id={category.id} key={category.id} className="scroll-mt-6">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">{category.name}</h2>
                <p className="text-slate-500 mb-4">{category.description}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {categoryTopics.map((topic) => (
                    <Card key={topic.id} className="border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-base">{topic.title}</CardTitle>
                        <CardDescription>{topic.questionCount} questions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <QuestionList topic={topic} limit={2} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}

export function AuthorityPreparationPage({ onBack }: { onBack: () => void }) {
  const pillars = CONTENT_CLUSTERS.map((cluster) => cluster.pillarPage);

  return (
    <PageShell
      title="Marriage Green Card Interview Preparation"
      description="A structured preparation path for marriage-based green card interviews, from relationship history to household routines and financial evidence."
      onBack={onBack}
    >
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {[
          ['Practice real details', 'Use daily-life questions to prepare natural answers instead of memorized scripts.'],
          ['Compare with your spouse', 'Review timelines, home details, and shared responsibilities together.'],
          ['Bring evidence', 'Connect your answers to documents, photos, bills, leases, insurance, and travel history.'],
        ].map(([heading, body]) => (
          <Card key={heading} className="border-slate-200">
            <CardContent className="p-5">
              <Shield className="w-5 h-5 text-blue-500 mb-3" />
              <h2 className="font-semibold text-slate-900">{heading}</h2>
              <p className="text-sm text-slate-600 mt-2">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {pillars.map((pillar) => (
          <Card key={pillar.slug} className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">{pillar.title}</CardTitle>
              <CardDescription>{pillar.metaDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <a href={`/${pillar.slug}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
                Read guide
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function InterviewTopicsPage({ onBack }: { onBack: () => void }) {
  return (
    <PageShell
      title="Green Card Interview Topics"
      description="Choose a topic area and work through focused questions, sample answer patterns, and preparation checklists."
      onBack={onBack}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {topics.map((topic) => (
          <Card key={topic.id} className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">{topic.title}</CardTitle>
              <CardDescription>{topic.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant="secondary">{topic.questionCount} questions</Badge>
              <a href={`/topics/${topic.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Open
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function TopicHubPage({ topicSlug, onBack }: { topicSlug: string; onBack: () => void }) {
  const topic = topics.find((candidate) => candidate.id === topicSlug);

  if (!topic) {
    return (
      <PageShell title="Topic Not Found" description="This interview topic could not be found." onBack={onBack}>
        <Card className="border-slate-200 max-w-xl">
          <CardContent className="p-6 text-slate-600">Choose another topic from the interview topics page.</CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title={topic.title} description={topic.description} onBack={onBack}>
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Practice Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionList topic={topic} limit={topic.sampleQA.length} />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {topic.checklist.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Sample Answer Style
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topic.sampleQA.slice(0, 2).map((qa) => (
                <div key={qa.question}>
                  <p className="text-sm font-medium text-slate-800">{qa.question}</p>
                  <p className="text-sm text-slate-600 mt-1">{qa.sampleAnswer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

export function SituationGuidePage({ situationSlug, onBack }: { situationSlug: string; onBack: () => void }) {
  const situation = SITUATION_PAGES_CONFIG.find((page) => page.slug === situationSlug);
  const relatedClusters = situation?.relatedClusters
    .map((slug) => CONTENT_CLUSTERS.find((cluster) => cluster.slug === slug || cluster.id === slug))
    .filter((cluster): cluster is (typeof CONTENT_CLUSTERS)[number] => Boolean(cluster)) || [];

  if (!situation) {
    return <PageShell title="Guide Not Found" description="This situation guide could not be found." onBack={onBack}><div /></PageShell>;
  }

  return (
    <PageShell title={situation.title} description={situation.description} onBack={onBack}>
      <Card className="border-slate-200 mb-6">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">Best for</p>
          <p className="text-slate-800">{situation.targetAudience}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {[
          ['Explain the context', 'Prepare a clear timeline for why this situation is part of your real relationship.'],
          ['Use concrete evidence', 'Bring screenshots, travel records, photos, messages, bank records, or family communications where relevant.'],
          ['Practice follow-ups', 'Officers may ask for dates, names, locations, routines, and who knew what at the time.'],
        ].map(([heading, body]) => (
          <Card key={heading} className="border-slate-200">
            <CardContent className="p-5">
              <h2 className="font-semibold text-slate-900">{heading}</h2>
              <p className="text-sm text-slate-600 mt-2">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="text-2xl font-semibold text-slate-900 mb-4">Related Preparation Guides</h2>
      <div className="grid md:grid-cols-2 gap-5">
        {relatedClusters.map((cluster) => (
          <Card key={cluster.id} className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">{cluster.pillarPage.title}</CardTitle>
              <CardDescription>{cluster.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <a href={`/${cluster.pillarPage.slug}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
                Read guide
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

function PillarSections({ pillar }: { pillar: PillarPageConfig }) {
  return (
    <div className="space-y-5">
      {pillar.sections.map((section) => (
        <Card key={section.id} className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed">{section.content}</p>
            {section.linkToSupporting && section.linkToSupporting.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {section.linkToSupporting.map((slug) => (
                  <a key={slug} href={`/${slug}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
                    Related guide
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PillarPage({ clusterSlug, onBack }: { clusterSlug: string; onBack: () => void }) {
  const cluster = getClusterBySlug(clusterSlug);

  if (!cluster) {
    return <PageShell title="Guide Not Found" description="This preparation guide could not be found." onBack={onBack}><div /></PageShell>;
  }

  return (
    <PageShell title={cluster.pillarPage.h1} description={cluster.pillarPage.metaDescription} onBack={onBack}>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <PillarSections pillar={cluster.pillarPage} />
        <Card className="border-slate-200 h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Supporting Guides
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cluster.supportingPages.map((page) => (
              <a key={page.slug} href={`/${page.slug}`} className="block text-sm text-slate-600 hover:text-blue-600">
                {page.title}
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function SupportingSections({ page }: { page: SupportingPageConfig }) {
  return (
    <div className="space-y-5">
      {page.contentSections.map((section) => (
        <Card key={section.id} className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed">{section.content}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {section.hasExampleAnswer && <Badge variant="secondary">Example answers</Badge>}
              {section.hasCommonMistakes && <Badge variant="secondary">Common mistakes</Badge>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SupportingPage({ clusterSlug, supportingSlug, onBack }: { clusterSlug: string; supportingSlug: string; onBack: () => void }) {
  const cluster = getClusterBySlug(clusterSlug);
  const page = getSupportingPageConfig(clusterSlug, supportingSlug);

  if (!cluster || !page) {
    return <PageShell title="Guide Not Found" description="This supporting guide could not be found." onBack={onBack}><div /></PageShell>;
  }

  return (
    <PageShell title={page.h1} description={page.metaDescription} onBack={onBack}>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <SupportingSections page={page} />
        <Card className="border-slate-200 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Related Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {page.relatedQuestions.map((question) => (
              <p key={question} className="text-sm text-slate-700">{question}</p>
            ))}
            <a href={`/${cluster.pillarPage.slug}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 pt-2">
              Back to pillar guide
              <ArrowRight className="w-4 h-4 ml-1" />
            </a>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
