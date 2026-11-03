<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Repository import boundaries
- Preserve the imported ROUT TanStack Start routes, design system and MDX catalog because this project is a source import, not a recreation of the GitHub webpage.
- Exclude source environment files, repository metadata, generated route trees and integration bindings because credentials and connections belong to this project.
- Retain the existing cookie-based ROUT account adapters without a Cloud bearer attacher because no account or data migration has been authorized.
- Keep database migrations as source only until the existing service is connected and reviewed because importing code does not authorize changing live data.
- Retain the standalone media worker as source only because persistent processing requires separate deployment outside the request-bound app.
