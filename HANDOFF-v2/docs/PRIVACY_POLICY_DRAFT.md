# Project Drive — privacy notice draft

> **Draft for closed beta. Legal review required before public launch.** The
> operator identity, contact address, launch countries and retention periods are
> still placeholders and must be completed before publication.

Project Drive stores the account details, vehicle projects, uploaded photographs,
saved visualizations and credit history needed to provide the service.

When real AI generation is enabled, the selected vehicle photograph and any
selected wheel reference image are transmitted to **fal.ai**, a third-party AI
provider, solely to create the requested visualization. Before storage and
processing, Project Drive normalizes uploads and removes EXIF metadata, including
embedded GPS data. Project Drive does not write full photograph URLs or generated
prompts to application logs.

Generated results and source photographs remain linked to the user's project.
Public result sharing is disabled unless the user explicitly enables a share
link, and that link can be disabled later.

Account records currently include email, optional name, password hash, sessions,
projects, credit transactions, invite redemption and product events. Passwords are
not stored in plain text. Uploaded images are normalized and EXIF/GPS metadata is
removed before they are stored or sent for generation.

The service uses data to authenticate users, generate and save results, protect
budgets, prevent abuse, investigate failures and answer support requests. It does
not sell personal information or use vehicle photographs for advertising.

Users should be able to request an export or deletion through [support email].
An account export endpoint already exists; production deletion and backup expiry
must be verified before launch. Proposed retention: source and generated images
until account/project deletion, operational logs for [30 days], and legally required
billing records for the applicable period. A lawyer must approve the final periods.

Production subprocessors will include the selected hosting provider, database
provider, object storage provider and fal.ai. Their legal names, locations and
international transfer basis must be listed before public launch.

This draft must be reviewed for the countries where the service will operate
before public launch. It accurately describes the current local implementation;
retention periods and a production contact address still need to be added.
