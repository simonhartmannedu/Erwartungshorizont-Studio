# Online EWH Archive Concept

This is a product concept only. It is not implemented in the app.

## Core Idea

It would be technically possible to create an online database for the EWH archive while keeping all student data local.

The clean split would be:

- Online EWH archive: shared or subscription-backed template and expectation-horizon library.
- Local student data: student lists, names, scores, comments, signatures, correction status, and local class assignments.

This architecture is sensible because EWH archive entries are mostly curriculum and template content, while student data is sensitive personal data.

## Data That Could Be Synced

- Exam metadata such as subject, grade level, school year, title, and unit.
- Sections, tasks, expectations, point structure, and grade scale.
- Sanitized reusable EWH templates.
- Tags, subject categories, school stage, and visibility settings.

## Data That Should Stay Local

- Student names.
- Student aliases if they can identify local people.
- Class lists.
- Scores and correction data.
- Individual teacher comments.
- Signatures.
- Printed-at timestamps.
- Local workspace-to-group assignments.

## Needed Product Boundary

The app would need a strict sanitization layer before upload:

- Strip achieved points if they reflect a corrected class.
- Strip `assignedGroupId`.
- Strip any student-specific fields.
- Treat uploaded archive entries as templates, not corrected exams.

Possible UI split:

- Local Archive: private browser-only archive.
- Online Archive: subscription library.
- Publish: upload a sanitized copy.
- Import to EWH: download a template into local workspaces.

## Backend Requirements

- Authentication for teacher accounts.
- Subscription or license management.
- Database tables for users, organizations, archive entries, tags, subjects, grade levels, visibility, and version history.
- API endpoints for search, publish, update, import, duplicate, and delete.
- Optional moderation or review workflow if teachers share content beyond their own account.

## Privacy And Legal Notes

This would still need GDPR-compliant handling because teacher accounts and uploaded material are data, even if no student data is uploaded.

Important requirements would likely include:

- Privacy policy.
- Terms of service.
- Data processing agreement for school subscriptions.
- Export and deletion rights.
- Access controls.
- Preferably EU-hosted infrastructure.

There is also a copyright risk if uploaded EWH material contains textbook excerpts, exam texts, publisher-owned content, or copyrighted tasks. A subscription archive would need clear upload rules and possibly moderation.

## Practical Conclusion

The model is feasible and the current app already has a useful boundary: EWH archive data can be separated from local student data. The main work would be sanitization, authentication, subscription/backend infrastructure, cloud archive schema, and a clear UI distinction between local student data and online EWH content.
