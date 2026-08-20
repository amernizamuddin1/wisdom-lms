# Wisdom LMS UI Brand Guidelines

## Purpose

This document defines the visual design system for Wisdom LMS.

The objective is to modernize the complete user interface while preserving all existing functionality, workflows, business logic, data structures, routes, APIs, integrations, permissions, and user journeys.

This is a UI-only redesign.

Do not remove, rename, disable, rewrite, or alter any current feature unless explicitly instructed separately.

---

# 1. Brand Direction

Wisdom LMS should feel:

- Intelligent
- Modern
- Calm
- Premium
- Structured
- Trustworthy
- Easy to use
- Suitable for long periods of learning and administration

The interface should avoid appearing overly playful, overly corporate, visually noisy, or generic.

The design language should be clean, spacious, highly readable, and consistent across learner, instructor, and admin interfaces.

---

# 2. Core Design Principles

1. Preserve all existing functionality.
2. Improve visual hierarchy without changing workflows.
3. Use consistent spacing, typography, color, borders, shadows, and component states.
4. Support both light mode and dark mode equally well.
5. Use semantic design tokens rather than hardcoded component-specific colors wherever possible.
6. Prioritize accessibility, readability, and clear interaction states.
7. Keep motion subtle and purposeful.
8. Avoid unnecessary gradients, excessive glassmorphism, or decorative effects.
9. Maintain responsive behavior across desktop, tablet, and mobile.
10. Do not introduce layout changes that break current features or user flows.

---

# 3. Typography

## Primary UI Font

Use Inter throughout the product.

Recommended font stack:

```css
font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
Roboto, Helvetica, Arial, sans-serif;
```

Use one font family consistently across the application.

---

# 4. Typography Scale

| Style | Font Size | Weight | Line Height | Letter Spacing |
|---|---:|---:|---:|---:|
| Display | 40px | 700 | 48px | -0.03em |
| H1 | 32px | 700 | 40px | -0.025em |
| H2 | 26px | 650 | 34px | -0.02em |
| H3 | 22px | 650 | 30px | -0.015em |
| H4 | 18px | 600 | 26px | -0.01em |
| H5 | 16px | 600 | 24px | 0 |
| H6 | 14px | 600 | 20px | 0 |

Recommended standard page title:

```text
Font size: 24px
Weight: 650
Line height: 32px
Letter spacing: -0.02em
```

---

# 5. Body Typography

| Style | Font Size | Weight | Line Height | Use |
|---|---:|---:|---:|---|
| Body Large | 16px | 400 | 24px | Longer descriptions |
| Body Medium | 14px | 400 | 21px | Default application text |
| Body Small | 13px | 400 | 19px | Secondary information |
| Caption | 12px | 450 | 17px | Metadata |
| Micro | 11px | 500 | 15px | Tags and labels |

Default interface body text:

```text
Font size: 14px
Font weight: 400
Line height: 21px
Letter spacing: 0
```

Avoid using normal UI text below 13px unless absolutely necessary.

---

# 6. Button Typography

Standard button:

```text
Font size: 14px
Font weight: 600
Line height: 20px
Letter spacing: -0.005em
```

Compact button:

```text
Font size: 13px
Font weight: 600
Line height: 18px
```

Do not use uppercase button labels.

Example:

Add Content

Not:

ADD CONTENT

---

# 7. Navigation Typography

Section label:

```text
Font size: 11px
Font weight: 600
Letter spacing: 0.04em
Color: tertiary text
```

Navigation item:

```text
Font size: 14px
Font weight: 500
Line height: 20px
```

Active navigation item:

```text
Font weight: 600
```

---

# 8. Primary Brand Color

Primary brand family: Wisdom Indigo.

| Token | Hex | Use |
|---|---|---|
| Wisdom 50 | #F5F3FF | Subtle backgrounds |
| Wisdom 100 | #EDE9FE | Hover states and badges |
| Wisdom 200 | #DDD6FE | Light borders |
| Wisdom 300 | #C4B5FD | Secondary highlights |
| Wisdom 400 | #A78BFA | Dark mode accents |
| Wisdom 500 | #7C5CFC | Secondary brand actions |
| Wisdom 600 | #6548E8 | Primary CTA and active navigation |
| Wisdom 700 | #5138C7 | Hover and pressed states |
| Wisdom 800 | #3C2A95 | Strong emphasis |
| Wisdom 900 | #281C66 | Deep brand applications |

Primary brand color:

```text
#6548E8
```

---

# 9. Supporting Colors

## Orange

Use for ratings, selective emphasis, promotions, and highlights.

```text
Primary: #F59E42
Hover: #E98A27
Soft background: #FFF4E5
```

## Success

```text
Primary: #16A36A
Dark mode: #35C98B
Soft background: #EAF8F1
```

## Warning

```text
Primary: #E99A18
Soft background: #FFF7E5
```

## Error

```text
Primary: #E5484D
Dark mode: #FF6369
Soft background: #FFF0F0
```

## Information

```text
Primary: #3B82F6
Soft background: #EFF6FF
```

---

# 10. Light Mode Color System

## Backgrounds and Surfaces

| Token | Hex | Use |
|---|---|---|
| background-canvas | #F7F8FA | Overall application background |
| background-page | #FAFBFC | Main page workspace |
| surface-primary | #FFFFFF | Cards, sidebars, modals |
| surface-secondary | #F4F5F7 | Secondary areas |
| surface-tertiary | #ECEEF2 | Inactive or muted containers |
| surface-brand-subtle | #F5F3FF | Active navigation and subtle brand states |

Recommended page structure:

```text
Application background: #F7F8FA
Main content surface: #FAFBFC
Cards: #FFFFFF
Active navigation: #F1EEFF
```

Avoid using pure white for every visible surface.

---

# 11. Dark Mode Color System

Do not simply invert the light theme.

Use deep neutral charcoal surfaces so the violet brand color remains distinctive.

| Token | Hex | Use |
|---|---|---|
| background-canvas | #0E0F13 | Overall application background |
| background-page | #121318 | Main workspace |
| surface-primary | #181A21 | Cards, sidebar, modals |
| surface-secondary | #20222B | Inputs and nested panels |
| surface-tertiary | #292C36 | Hover states |
| surface-brand-subtle | #25203D | Active navigation |

Recommended dark mode brand treatment:

```text
Primary action: #8068FF
Primary hover: #927FFF
Selected background: #292244
Brand border accent: #6D58D9
```

---

# 12. Text Colors

## Light Mode

| Token | Hex |
|---|---|
| Primary text | #181A20 |
| Secondary text | #515563 |
| Tertiary text | #747986 |
| Disabled text | #A7ABB4 |
| Brand text | #6548E8 |
| Text on primary | #FFFFFF |

## Dark Mode

| Token | Hex |
|---|---|
| Primary text | #F4F5F7 |
| Secondary text | #B8BBC5 |
| Tertiary text | #8D919D |
| Disabled text | #5F636E |
| Brand text | #A994FF |
| Text on primary | #FFFFFF |

Avoid pure black text in light mode and pure white text everywhere in dark mode.

---

# 13. Spacing System

Use an 8-point spacing system with selected 4px increments.

| Token | Value |
|---|---:|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-5 | 20px |
| space-6 | 24px |
| space-8 | 32px |
| space-10 | 40px |
| space-12 | 48px |
| space-16 | 64px |

Recommended layout spacing:

```text
Page horizontal padding: 24px to 32px
Section gap: 24px
Card internal padding: 16px
Large card internal padding: 20px or 24px
Form field vertical gap: 16px
Label to input gap: 8px
```

---

# 14. Border Radius

| Component | Radius |
|---|---:|
| Small tag | 5px |
| Small control | 6px |
| Input | 8px |
| Button | 8px |
| Card | 10px to 12px |
| Modal | 14px to 16px |
| Large feature card | 16px |
| Pill | 999px |

Default recommendation:

```text
Input radius: 8px
Button radius: 8px
Card radius: 12px
Modal radius: 16px
```

---

# 15. Borders

## Light Mode

```text
Default border: #E2E4E9
Strong border: #D2D5DC
Subtle border: #ECEEF2
Brand focus border: #7C5CFC
```

## Dark Mode

```text
Default border: #2C2F38
Strong border: #3A3D48
Subtle border: #252730
Brand focus border: #8068FF
```

Default border width:

```text
1px
```

Use 2px only for focus rings or deliberate emphasis.

---

# 16. Shadows

## Light Mode Card Shadow

```css
box-shadow:
  0 1px 2px rgba(20, 24, 35, 0.04),
  0 4px 12px rgba(20, 24, 35, 0.05);
```

## Light Mode Modal Shadow

```css
box-shadow:
  0 8px 24px rgba(20, 24, 35, 0.10),
  0 2px 6px rgba(20, 24, 35, 0.05);
```

## Dark Mode Elevated Surface

Use shadows sparingly.

```css
box-shadow:
  0 6px 20px rgba(0, 0, 0, 0.28);
```

Prefer surface contrast and borders over heavy shadows in dark mode.

---

# 17. Buttons

## Primary Button, Light Mode

```text
Background: #6548E8
Text: #FFFFFF
Hover: #583BCF
Pressed: #4930B3
Disabled: #CFC7F7
```

## Primary Button, Dark Mode

```text
Background: #8068FF
Text: #FFFFFF
Hover: #927FFF
Pressed: #6F56E8
Disabled: #393348
```

Standard button geometry:

```text
Height: 40px
Horizontal padding: 16px
Radius: 8px
```

Major CTA:

```text
Height: 44px
Horizontal padding: 20px
```

---

# 18. Secondary Buttons

## Light Mode

```text
Background: #FFFFFF
Text: #353842
Border: #D8DBE2
Hover background: #F7F8FA
```

## Dark Mode

```text
Background: #20222B
Text: #F4F5F7
Border: #383B45
Hover background: #292C36
```

---

# 19. Inputs and Search Fields

Standard input:

```text
Height: 40px
Radius: 8px
Horizontal padding: 12px
Font size: 14px
```

## Light Mode

```text
Background: #FFFFFF
Border: #DFE2E7
Text: #181A20
Placeholder: #9195A1
```

## Dark Mode

```text
Background: #20222B
Border: #343741
Text: #F4F5F7
Placeholder: #757A87
```

Focus state:

```text
Border: #7C5CFC
Focus ring: 0 0 0 3px rgba(124, 92, 252, 0.16)
```

---

# 20. Course Cards

Recommended design:

```text
Background: surface-primary
Radius: 12px
Border: 1px subtle border
Content padding: 16px
Image aspect ratio: approximately 16:9
Image radius: 8px
Minimum card gap: 16px
```

Hover should use subtle elevation only.

Course title:

```text
Font size: 14px
Weight: 600
Line height: 20px
Maximum: 2 lines where possible
```

Category badge:

```text
Font size: 11px
Weight: 600
Line height: 16px
Padding: 3px 7px
```

Light mode badge:

```text
Background: #F1EEFF
Text: #5B42D5
```

Dark mode badge:

```text
Background: #2D2745
Text: #B6A6FF
```

Price:

```text
Font size: 14px
Weight: 700
Color: Wisdom Indigo
```

Recommended information hierarchy:

1. Course image
2. Category and rating
3. Course title
4. Instructor, if already supported
5. Divider
6. Students enrolled and price

Do not add new data fields unless the current feature already supports them.

---

# 21. Modals

Recommended modal:

```text
Width: 520px to 600px where appropriate
Radius: 16px
Padding: 24px
```

Content option cards:

```text
Minimum height: 72px
Padding: 14px
Radius: 10px
Border: 1px
Gap between cards: 12px
```

Selected state, light mode:

```text
Border: #6548E8
Background: #F8F6FF
Inner highlight: 0 0 0 1px rgba(101, 72, 232, 0.15)
```

Selected state, dark mode:

```text
Border: #8068FF
Background: #28223E
```

---

# 22. Multi-Step Interfaces

For course creation, learning path creation, onboarding, or other multi-step flows:

Completed step:

```text
#6548E8
```

Current step:

```text
#A78BFA
```

Upcoming step, light mode:

```text
#E3E5EA
```

Upcoming step, dark mode:

```text
#30333D
```

Do not use orange for progress unless orange has a specific semantic meaning.

---

# 23. Iconography

Use:

```text
Outline icons
1.75px stroke
Rounded line caps
20px standard size
16px compact size
24px feature size
```

Do not mix filled and outlined icons arbitrarily.

## Light Mode

```text
Primary icon: #4B4F5C
Secondary icon: #7C808C
Brand icon: #6548E8
```

## Dark Mode

```text
Primary icon: #C4C7D0
Secondary icon: #8E929E
Brand icon: #A994FF
```

---

# 24. Interactive States

Every interactive component must define:

1. Default
2. Hover
3. Active or pressed
4. Focus
5. Disabled

Active sidebar item, light mode:

```text
Background: #F1EEFF
Text: #5138C7
Icon: #6548E8
```

Active sidebar item, dark mode:

```text
Background: #292244
Text: #B6A6FF
Icon: #A994FF
```

Hover states must never be visually stronger than active states.

---

# 25. Header

Recommended structure:

```text
Height: 64px
Background: surface-primary
Bottom border: 1px solid subtle border
Horizontal padding: 24px
```

Top search bar:

```text
Width: 320px to 420px on desktop
Height: 40px
```

Profile area:

```text
Avatar: 32px to 36px
User name: 13px, weight 600
Role: 11px, weight 400
Avatar to text gap: 8px
```

---

# 26. Sidebar

Recommended dimensions:

```text
Expanded width: 224px
Collapsed width: 72px
```

Navigation item:

```text
Height: 40px
Horizontal padding: 12px
Radius: 8px
Icon to text gap: 10px
```

Section spacing:

```text
24px
```

Prefer spacing and typography for hierarchy instead of excessive divider lines.

---

# 27. Dark Mode Summary

```text
Application background: #0E0F13
Sidebar: #121318
Header: #121318
Main page: #0E0F13
Card: #181A21
Input: #20222B
Card border: #2C2F38
Primary text: #F4F5F7
Secondary text: #B8BBC5
Primary CTA: #8068FF
Active sidebar: #292244
Active text: #B6A6FF
```

---

# 28. Light Mode Summary

```text
Application background: #F7F8FA
Sidebar: #FFFFFF
Header: #FFFFFF
Main workspace: #FAFBFC
Cards: #FFFFFF
Inputs: #FFFFFF
Borders: #E2E4E9
Primary text: #181A20
Secondary text: #515563
Primary CTA: #6548E8
Active sidebar: #F1EEFF
Active text: #5138C7
```

---

# 29. Responsive Guidelines

Desktop:

```text
Page title: 24px
Section title: 18px
Body: 14px
Sidebar text: 14px
```

Tablet:

```text
Page title: 22px
Body: 14px
```

Mobile:

```text
Page title: 20px
Body: 14px
Minimum interactive target: 44px
```

Maintain all current responsive behavior unless a direct visual improvement is required.

Do not remove functionality or hide important actions solely for visual simplification.

---

# 30. Motion Guidelines

Use subtle motion only.

Recommended:

```text
Hover transition: 150ms to 200ms
Modal transition: 180ms to 240ms
Dropdown transition: 150ms to 180ms
Sidebar collapse transition: 200ms to 250ms
```

Recommended easing:

```css
cubic-bezier(0.2, 0.8, 0.2, 1)
```

Avoid bouncy, playful, distracting, or excessively long animations.

---

# 31. Accessibility

Minimum requirements:

- Preserve visible keyboard focus states.
- Maintain readable contrast in light and dark modes.
- Do not rely only on color to communicate status.
- Preserve semantic HTML where already present.
- Do not remove aria labels or accessibility attributes.
- Ensure touch targets are large enough.
- Keep body text readable at normal zoom.
- Avoid disabling browser focus outlines unless replaced by a clear custom focus state.

---

# 32. Implementation Rules for Claude Code

These rules are mandatory.

## UI-Only Scope

Do not change:

- Existing features
- Existing routes
- API contracts
- Database schema
- Database queries unless required only to preserve current UI behavior
- Authentication
- Authorization
- Permissions
- Business logic
- Pricing logic
- Enrollment logic
- Checkout logic
- Razorpay integration
- Webhook logic
- Course creation logic
- Quiz functionality
- Assignment functionality
- Learning path functionality
- CSV import functionality
- Admin functionality
- Existing validation logic
- Existing form submission behavior
- Current user flows

Do not add new features unless explicitly requested.

Do not remove existing features.

Do not rename user-facing features in a way that changes meaning.

Do not redesign workflows unless explicitly requested.

---

# 33. Preferred Technical Approach

Where possible:

1. Audit the current frontend structure first.
2. Identify the global styling system.
3. Create reusable semantic design tokens.
4. Implement light and dark theme variables.
5. Update shared components first.
6. Then update individual pages.
7. Preserve all existing component props and behaviors.
8. Avoid rewriting working logic unnecessarily.
9. Use existing component architecture where practical.
10. Keep changes easy to review and revert.

Recommended semantic tokens:

```css
--color-bg-canvas
--color-bg-page
--color-surface-primary
--color-surface-secondary
--color-surface-tertiary
--color-surface-brand-subtle

--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-text-disabled

--color-brand-primary
--color-brand-hover
--color-brand-pressed

--color-border-default
--color-border-subtle
--color-border-strong

--radius-sm
--radius-md
--radius-lg
--radius-xl

--space-1
--space-2
--space-3
--space-4
--space-5
--space-6
--space-8
```

---

# 34. Final Visual Direction

The final product should feel like a premium modern SaaS platform with a clean learning-focused identity.

The strongest visual priorities are:

1. Wisdom Indigo as the core brand color.
2. Inter as the product-wide font.
3. Clear visual hierarchy.
4. Better surface differentiation.
5. Consistent spacing and radii.
6. Strong light and dark themes.
7. Modern, subtle interaction states.
8. Complete preservation of all existing functionality.

The target is not to create a new product.

The target is to make the existing Wisdom LMS look significantly more refined, modern, branded, consistent, and premium without changing what it currently does.
