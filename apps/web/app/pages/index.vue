<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const runtimeConfig = useRuntimeConfig()
const publicConfig = runtimeConfig.public
const appName =
  publicConfig.appName && publicConfig.appName.length > 0 ? publicConfig.appName : 'BeenSoberFor'

const pageTitle = `${appName} | Simple Sobriety Day Counter`
const pageDescription =
  'Track how long you have been sober with a simple personal counter. Create a shareable profile, upload your photo, and print a QR code for your progress page.'

useSeo({
  title: pageTitle,
  description: pageDescription,
  keywords: [
    'sober counter',
    'sobriety counter',
    'sober day counter',
    'sobriety calculator',
    'days sober calculator',
    'sober anniversary',
  ],
  ogImage: {
    title: pageTitle,
    description: pageDescription,
    icon: 'i-lucide-leaf',
  },
})

useWebPageSchema({
  name: pageTitle,
  description: pageDescription,
})

const howSteps = [
  {
    title: 'Pick your date',
    body: 'Choose the day you count from. You can adjust it later with a careful reset flow.',
  },
  {
    title: 'Create your page',
    body: 'Add your name, optional photo, and a short line if you want. This becomes your share link.',
  },
  {
    title: 'Share or print your QR',
    body: 'Copy the link, open a print-friendly view, or save a QR code for a card or fridge note.',
  },
] as const

const includes = [
  'Live day counter (years, months, days—and optional hours on your private view)',
  'Profile photo and display name',
  'Personal link such as /u/yourname',
  'Printable QR that opens your public page',
] as const

const privacyModes = [
  {
    title: 'Private',
    body: 'Only you can see your page after signing in.',
  },
  {
    title: 'Unlisted',
    body: 'Anyone with the link can view it; search engines are asked not to index it.',
  },
  {
    title: 'Public',
    body: 'You may allow indexing when you explicitly want discoverability.',
  },
] as const

const milestones = [
  { label: '7 days', to: '/sobriety-calculator' },
  { label: '30 days', to: '/30-days-sober' },
  { label: '100 days', to: '/100-days-sober' },
  { label: '1 year', to: '/1-year-sober' },
] as const

const faqTeaser = [
  {
    q: 'Can I keep my page private?',
    a: 'Yes. Choose private, unlisted, or public in share settings. Profiles are not indexed by default.',
    id: 'private',
  },
  {
    q: 'How does reset work?',
    a: 'Start Again lives on your private dashboard. It uses clear confirmation steps and direct copy—never casual.',
    id: 'reset',
  },
  {
    q: 'Can I print my QR code?',
    a: 'Yes. Open the print view from share settings for a high-contrast layout with your URL.',
    id: 'print',
  },
] as const
</script>

<template>
  <div>
    <UContainer class="py-10 sm:py-14 lg:py-16">
      <section
        class="bsf-hero bsf-hero-pattern border-default relative overflow-hidden rounded-[2rem] border px-5 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20"
      >
        <div
          class="relative grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16"
        >
          <div>
            <p
              class="text-primary-600 dark:text-primary-400 font-display mb-4 text-sm font-medium italic sm:text-base"
            >
              Set your date. Track your time. Share your progress.
            </p>
            <h1
              class="font-display text-highlighted max-w-[22ch] text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Track how long you have been sober.
            </h1>
            <p class="text-muted mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
              Create a simple page with your photo, live counter, and a QR code you can share or
              print. Calm, private by default, and built for sharing—not feeds.
            </p>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <UButton to="/register" color="primary" size="xl" icon="i-lucide-plus" trailing>
                Start my counter
              </UButton>
              <UButton
                to="/example"
                color="neutral"
                variant="outline"
                size="xl"
                icon="i-lucide-external-link"
              >
                View example profile
              </UButton>
            </div>
          </div>

          <div class="relative">
            <div
              class="bsf-preview-ring border-default from-primary-50/90 to-default relative rounded-[1.75rem] border bg-linear-to-b p-1 dark:from-primary-950/40"
            >
              <div class="rounded-2xl bg-default p-6 sm:p-8">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-muted text-xs font-medium uppercase tracking-wider">
                      Live example
                    </p>
                    <p class="font-display text-highlighted mt-1 text-lg font-semibold sm:text-xl">
                      Public share page
                    </p>
                  </div>
                  <UBadge color="primary" variant="subtle">Sample</UBadge>
                </div>
                <div class="mt-6 flex flex-col items-center text-center">
                  <p class="text-muted text-sm">Jamie has been sober for</p>
                  <p
                    class="font-display text-primary-600 dark:text-primary-400 mt-2 text-6xl font-semibold leading-none tracking-tight sm:text-7xl"
                  >
                    1,248
                  </p>
                  <p class="text-muted mt-1 text-sm font-medium">days</p>
                  <p class="text-dimmed mt-2 text-xs">3 years, 5 months, 1 day</p>
                  <USeparator class="my-6 max-w-xs" />
                  <div
                    class="border-default flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30"
                    aria-hidden="true"
                  >
                    <UIcon name="i-lucide-qr-code" class="text-muted h-14 w-14" />
                  </div>
                  <p class="text-dimmed mt-4 text-xs">
                    QR points to your public link—print or share.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </UContainer>

    <UContainer id="how" class="scroll-mt-28 pb-14 sm:pb-20">
      <h2 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
      <p class="text-muted mt-3 max-w-2xl leading-relaxed">
        No clutter, no community feed—just the essentials for a counter you can stand beside.
      </p>
      <ol class="mt-10 grid gap-6 md:grid-cols-3">
        <li
          v-for="(step, i) in howSteps"
          :key="step.title"
          class="border-default rounded-2xl border bg-default/80 p-6"
        >
          <span
            class="bg-primary-500 inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
            >{{ i + 1 }}</span
          >
          <h3 class="font-display mt-4 text-lg font-semibold">{{ step.title }}</h3>
          <p class="text-muted mt-2 text-sm leading-relaxed">{{ step.body }}</p>
        </li>
      </ol>
    </UContainer>

    <UContainer id="includes" class="scroll-mt-28 pb-14 sm:pb-20">
      <h2 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        What your page includes
      </h2>
      <ul class="mt-6 grid gap-3 sm:max-w-2xl">
        <li
          v-for="item in includes"
          :key="item"
          class="text-muted flex gap-3 text-sm leading-relaxed sm:text-base"
        >
          <UIcon
            name="i-lucide-check"
            class="text-primary-600 dark:text-primary-400 mt-0.5 h-5 w-5 shrink-0"
          />
          <span>{{ item }}</span>
        </li>
      </ul>
    </UContainer>

    <UContainer id="privacy" class="scroll-mt-28 pb-14 sm:pb-20">
      <h2 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Privacy options
      </h2>
      <p class="text-muted mt-3 max-w-2xl leading-relaxed">
        You choose how visible your sobriety page is. Default settings lean away from surprise
        exposure.
      </p>
      <div class="mt-8 grid gap-5 md:grid-cols-3">
        <UCard v-for="mode in privacyModes" :key="mode.title">
          <h3 class="font-display text-lg font-semibold">{{ mode.title }}</h3>
          <p class="text-muted mt-2 text-sm leading-relaxed">{{ mode.body }}</p>
        </UCard>
      </div>
    </UContainer>

    <UContainer id="milestones" class="scroll-mt-28 pb-14 sm:pb-20">
      <h2 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Milestone guides
      </h2>
      <p class="text-muted mt-3 max-w-2xl leading-relaxed">
        Plain-language pages for common anniversaries—plus the calculator for any date.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <UButton
          v-for="m in milestones"
          :key="m.label"
          :to="m.to"
          color="neutral"
          variant="outline"
          size="lg"
        >
          {{ m.label }}
        </UButton>
      </div>
    </UContainer>

    <UContainer id="learn-more" class="scroll-mt-28 pb-14 sm:pb-20">
      <h2 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        What is BeenSoberFor?
      </h2>
      <div class="text-muted mt-6 max-w-3xl space-y-4 text-sm leading-relaxed sm:text-base">
        <p>
          {{ appName }} is a sobriety day counter with a shareable profile and optional QR code. It
          is for people who want a single, respectful page—not a treatment program, medical service,
          or discussion forum.
        </p>
        <h3 class="text-highlighted font-display text-lg font-semibold">
          How does the sober counter work?
        </h3>
        <p>
          You choose a start date; we calculate the time since then in years, months, and days. You
          can keep detail on your private dashboard and show a cleaner view publicly.
        </p>
        <h3 class="text-highlighted font-display text-lg font-semibold">
          Can I keep my page private?
        </h3>
        <p>
          Yes. Use private, unlisted, or public modes, and control whether search engines may index
          your profile. See the
          <ULink to="/faq" class="text-primary-600 underline dark:text-primary-400">FAQ</ULink>
          for detail.
        </p>
        <h3 class="text-highlighted font-display text-lg font-semibold">Can I print my QR code?</h3>
        <p>
          Yes. Share settings include a print-friendly layout: name, large day count, QR, short URL,
          and optional message—designed to work in black and white.
        </p>
        <h3 class="text-highlighted font-display text-lg font-semibold">Who is this for?</h3>
        <p>
          Anyone tracking alcohol-free time who wants a simple personal page to share on their own
          terms—without gamification or social pressure.
        </p>
      </div>
    </UContainer>

    <UContainer id="faq-preview" class="scroll-mt-28 pb-14 sm:pb-20">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            FAQ preview
          </h2>
          <p class="text-muted mt-3 max-w-xl leading-relaxed">
            Practical answers about privacy, reset, sharing, and printing.
          </p>
        </div>
        <UButton to="/faq" variant="outline" color="neutral" icon="i-lucide-circle-help">
          Open full FAQ
        </UButton>
      </div>
      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <UCard v-for="item in faqTeaser" :key="item.id">
          <h3 class="font-display text-base font-semibold">{{ item.q }}</h3>
          <p class="text-muted mt-2 text-sm leading-relaxed">{{ item.a }}</p>
          <ULink
            :to="`/faq#${item.id}`"
            class="text-primary-600 mt-3 inline-block text-sm dark:text-primary-400"
          >
            Read more
          </ULink>
        </UCard>
      </div>
    </UContainer>

    <UContainer id="support" class="scroll-mt-28 pb-6">
      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-lucide-heart-pulse"
        title="Not a substitute for care"
        :description="`${appName} is a simple tracking and sharing tool. It is not medical advice, treatment, or crisis support. If you or someone else is in immediate danger, contact local emergency services. In the U.S., SAMHSA’s National Helpline is 1-800-662-4357 (free, confidential, 24/7).`"
      />
    </UContainer>

    <UContainer class="pb-16 sm:pb-24">
      <section
        class="border-primary-200 dark:border-primary-900 from-primary-50/90 to-primary-100/50 font-display relative overflow-hidden rounded-[2rem] border bg-linear-to-br px-6 py-12 text-center sm:px-10 sm:py-16 dark:from-primary-950/30 dark:to-primary-950/55"
      >
        <div class="relative mx-auto max-w-2xl">
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            Track your sober time. Share your progress your way.
          </h2>
          <p class="text-muted mt-4 text-base leading-relaxed">
            Keep it private or make it public. Print your QR anytime. Reset your date when you need
            to—with supportive, non-punitive copy.
          </p>
          <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <UButton to="/register" color="primary" size="xl" icon="i-lucide-leaf">
              Create your page
            </UButton>
            <UButton
              to="/sobriety-calculator"
              color="neutral"
              variant="outline"
              size="xl"
              icon="i-lucide-calculator"
            >
              Try the calculator
            </UButton>
          </div>
        </div>
      </section>
    </UContainer>
  </div>
</template>
