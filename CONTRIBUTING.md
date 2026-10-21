# Contributing to MediAssist

This is the workflow for every change, including your first one. The full SCM Plan is in [docs/SCM-Plan.pdf](docs/SCM-Plan.pdf).

## 0. Set up
```bash
git clone https://github.com/johnjeremyw/mediassist.git
cd mediassist
npm ci
npx expo start
```
The backend must be running; see the README.

## 1. Start from an issue
Every change needs a GitHub issue, made from the **Bug report** or **Feature request** template.
If it touches reminders, notifications, medication data, caregiver alerts or sign-in,
add the `safety-critical` label and fill in the impact-analysis section.

## 2. Create a short-lived branch from `main`
```bash
git checkout main
git pull origin main
git checkout -b feature/12-snooze-button   # <type>/<issue>-<short-description>
```
Types: `feature`, `fix`, `hotfix`, `docs`, `chore`. Lowercase, words joined by hyphens.
Keep the branch under 3 days old and run `git pull --rebase origin main` daily.
Never commit straight to `main`; it is protected and the push will be rejected.

## 3. Commit using Conventional Commits
```
feat(reminders): add 10-minute snooze button (#12)
fix(caregiver): show alert when a dose is missed twice (#15)
```

## 4. Open a pull request into `main`
```bash
git push -u origin feature/12-snooze-button
```
Open the PR on GitHub, write `Closes #12` in the description and complete the checklist.

## 5. Get it merged
- The `build` and `dependency-review` checks must pass.
- One approval from a teammate who is not the author.
- Safety-critical files (listed in `.github/CODEOWNERS`) also need a code owner's approval.
  By team rule, a `safety-critical` PR gets approvals from **both** other team members.
- All review conversations resolved.
- Merge with **Squash and merge** only; the PR title becomes the commit message, so keep it in Conventional Commit form.
- The branch is deleted automatically after merging.

## Accessibility rules (checked in review)
Minimum 18pt text, 4.5:1 contrast, 48px touch targets, at most 2 taps to any core action. Constraints live in `theme.js`.
