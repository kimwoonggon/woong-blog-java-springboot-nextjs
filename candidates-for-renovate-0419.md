# Renovation Candidates - 2026-04-19

## Purpose

This document records backend renovation candidates discussed during the 2026-04-19 CQRS/Clean Architecture refactor review.

Use this as a running decision log. New questions and follow-up design discussions should be appended as additional candidates or notes instead of being lost in chat history.

## Current Context

The current Content backend refactor moved the broad actor services toward a CQRS structure:

```text
Before:
Endpoint -> MediatR Handler -> Admin/Public Service -> DbContext

After:
Endpoint -> MediatR Handler -> Command/Query Store -> DbContext
```

The discussion focused on whether this is a good direction and which parts should be renovated next.

## Candidate 1 - Slug Generation Responsibility

### Current State

`CreateBlogCommandHandler` contains a private `GenerateUniqueSlugAsync` method.

`UpdateBlogCommandHandler`, `CreateWorkCommandHandler`, and `UpdateWorkCommandHandler` have similar logic.

Current example:

```csharp
private async Task<string> GenerateUniqueSlugAsync(string title, Guid? currentBlogId, CancellationToken cancellationToken)
{
    var baseSlug = AdminContentText.Slugify(title, "post");
    var slug = baseSlug;
    var suffix = 2;

    while (await _blogCommandStore.SlugExistsAsync(slug, currentBlogId, cancellationToken))
    {
        slug = $"{baseSlug}-{suffix}";
        suffix += 1;
    }

    return slug;
}
```

### Assessment

This is acceptable for the current refactor because slug generation is part of the create/update blog use case and a command handler can own use-case orchestration.

However, it is a clear renovation candidate because the same policy appears in multiple handlers.

### Problems

- Duplicate logic across create/update handlers.
- Similar duplicate logic between Blog and Work.
- Slug policy changes require edits in multiple handlers.
- The fallback prefix rule (`post`, `work`) and uniqueness suffix loop are scattered.

### Recommended Direction

Extract slug generation into an application-level policy/service.

Possible names:

- `ContentSlugGenerator`
- `UniqueSlugPolicy`
- `IBlogSlugService`
- `IWorkSlugService`

Preferred shape is a shared policy that does not directly depend on EF:

```csharp
public interface IUniqueSlugGenerator
{
    Task<string> GenerateAsync(
        string source,
        string fallbackPrefix,
        Guid? excludedEntityId,
        Func<string, Guid?, CancellationToken, Task<bool>> existsAsync,
        CancellationToken cancellationToken);
}
```

This keeps slug formatting and suffix policy reusable while leaving existence checks in the relevant store.

### Decision

Keep as-is for now. Extract when the next backend renovation slice addresses duplication or domain policy cleanup.

## Candidate 2 - BlogCommandStore Responsibility

### Current State

`IBlogCommandStore` contains:

```csharp
Task<bool> SlugExistsAsync(string slug, Guid? excludedBlogId, CancellationToken cancellationToken);
Task<Blog?> GetByIdForUpdateAsync(Guid id, CancellationToken cancellationToken);
void Add(Blog blog);
void Remove(Blog blog);
Task SaveChangesAsync(CancellationToken cancellationToken);
```

`BlogCommandStore` implements these methods using `WoongBlogDbContext`.

### Assessment

This is a reasonable write-side persistence port. It is not a domain service. It is closer to a repository/store abstraction for command handlers.

The current naming is acceptable because the codebase is still a single project and the intent is pragmatic CQRS rather than a fully separated multi-project Clean Architecture.

### Good Points

- Handlers no longer inject `WoongBlogDbContext` directly.
- EF Core is hidden behind an application abstraction.
- Command and query persistence are separated.
- This is significantly better than the previous broad `AdminBlogService` owning use-case logic, projection, persistence, slugging, and mutation together.

### Problems

- `Add`, `Remove`, and `SaveChangesAsync` expose repository/unit-of-work style primitives.
- `SaveChangesAsync` means the store also owns commit coordination.
- If a future command spans multiple stores, transaction boundaries become less clear.

### Recommended Direction

Short term: keep `BlogCommandStore` as a write-side persistence port.

Potential future split:

```csharp
IBlogCommandStore.Add(blog);
await IAppUnitOfWork.SaveChangesAsync(cancellationToken);
```

or rename and clarify:

- `IBlogWriteStore`
- `IBlogCommandRepository`
- `IBlogWriter`

### Decision

Keep as-is for now. Consider `IUnitOfWork` only when a single command starts coordinating multiple stores/aggregates.

## Candidate 3 - Handler Use-Case Ownership

### Current State

Handlers now own use-case orchestration.

For example, `CreateBlogCommandHandler`:

- generates a slug
- extracts/generates excerpt
- creates a `Blog`
- sets `PublishedAt`, `CreatedAt`, `UpdatedAt`
- sets `SearchTitle` and `SearchText`
- calls `IBlogCommandStore.Add`
- saves
- returns `AdminMutationResult`

### Assessment

This is valid CQRS application-layer design. A command handler is allowed to orchestrate a use case.

The current implementation moved meaningful work out of broad services and into handlers, which matches the intended refactor direction.

### Problems

- The handler now knows many entity field assignment details.
- Domain rules are still mostly procedural/anemic.
- Blog creation/update rules are not encapsulated in the domain model.

### Recommended Direction

If the codebase moves toward richer domain modeling, introduce factory/methods:

```csharp
var blog = Blog.Create(
    title,
    slug,
    excerpt,
    tags,
    published,
    contentJson,
    now);
```

and:

```csharp
blog.UpdateContent(...);
blog.Publish(now);
blog.Unpublish();
```

### Decision

Keep handler orchestration for now. Consider domain factory/method extraction after slug policy duplication is addressed.

## Candidate 4 - Time Handling

### Current State

Handlers call `DateTimeOffset.UtcNow` directly.

Examples:

- `CreateBlogCommandHandler`
- `UpdateBlogCommandHandler`
- `CreateWorkCommandHandler`
- `UpdateWorkCommandHandler`

### Assessment

Direct `UtcNow` is simple but makes time-dependent behavior harder to test precisely.

### Problems

- Tests cannot inject a fixed clock.
- Multiple `UtcNow` calls inside the same use case can produce slightly different timestamps.
- Time behavior is not centralized.

### Recommended Direction

Introduce `TimeProvider` or an `IClock` abstraction.

Preferred .NET-native direction:

```csharp
public sealed class CreateBlogCommandHandler(
    IBlogCommandStore blogCommandStore,
    TimeProvider timeProvider)
{
    var now = timeProvider.GetUtcNow();
}
```

### Decision

Not urgent. Good candidate for a small cleanup slice after current architecture stabilizes.

## Candidate 5 - Store Naming

### Current State

Names:

- `BlogCommandStore`
- `BlogQueryStore`
- `WorkCommandStore`
- `WorkQueryStore`
- `PageCommandStore`
- `PageQueryStore`

### Assessment

The names are understandable. `CommandStore` and `QueryStore` communicate CQRS split.

### Alternatives

- `BlogWriteStore` / `BlogReadStore`
- `BlogCommandRepository` / `BlogQueryRepository`
- `BlogWriter` / `BlogReader`

### Recommendation

Keep current naming unless the team wants a more explicit repository vocabulary.

If changed, prefer:

```text
BlogWriteStore / BlogReadStore
WorkWriteStore / WorkReadStore
PageWriteStore / PageReadStore
```

because they describe intent without overloading “repository”.

### Decision

Keep as-is for now.

## Candidate 6 - SaveChanges Boundary

### Current State

Each command store exposes `SaveChangesAsync`.

Handlers call:

```csharp
_blogCommandStore.Add(blog);
await _blogCommandStore.SaveChangesAsync(cancellationToken);
```

### Assessment

This is acceptable in a single DbContext, single aggregate mutation flow.

### Problems

- Store is acting as both repository and unit-of-work.
- Multi-store commands would have awkward commit semantics.
- Transaction policy is implicit.

### Recommended Direction

Only introduce `IUnitOfWork` when a command needs to coordinate multiple stores.

Until then, the current design is simpler and acceptable.

### Decision

Do not introduce `IUnitOfWork` yet.

## Candidate 7 - Search Field Duplication

### Current State

Handlers explicitly set:

```csharp
SearchTitle = ContentSearchText.Normalize(request.Title)
SearchText = ContentSearchText.BuildIndex(...)
```

`WoongBlogDbContext.SaveChanges` and `SaveChangesAsync` also synchronize these fields for added/modified `Blog` and `Work` entities.

### Assessment

This duplication is intentional defensive synchronization but can be confusing.

### Good Points

- Handler makes the intended values explicit.
- DbContext prevents seed/other mutation paths from forgetting search fields.

### Problems

- Two places appear to own the same invariant.
- Future changes to search indexing rules must update both handler code and DbContext synchronization unless handlers stop setting fields.

### Recommended Direction

Choose one owner:

1. DbContext owns search field synchronization entirely.
2. Domain/application method owns it entirely.
3. Dedicated `ContentSearchIndexUpdater` owns it and DbContext/handlers call the same method.

Preferred future direction:

```text
ContentSearchIndexUpdater.Apply(blog)
ContentSearchIndexUpdater.Apply(work)
```

### Decision

Keep current redundancy for now. Extract a shared updater if search logic changes again.

## Candidate 8 - Current Design Verdict

### Verdict

The current structure is reasonable and substantially better than the previous service-heavy structure.

It is best described as:

```text
Pragmatic single-project CQRS with application-owned use cases
```

It is not yet:

```text
Fully domain-rich Clean Architecture
```

### Why It Is Reasonable

- Handler now owns use-case flow.
- Store now hides EF persistence.
- Query and command paths are separated.
- Broad actor services were removed.
- Domain dependency direction improved.

### What To Renovate Next

Priority order:

1. Extract shared slug generation policy.
2. Introduce `TimeProvider`/`IClock`.
3. Decide single owner for search field synchronization.
4. Consider domain factory/methods for `Blog` and `Work`.
5. Consider `IUnitOfWork` only when multi-store transactions appear.

## Running Notes

Append future renovation discussions below this section.

## Candidate 9 - Application Layer vs Persistence Layer Boundary

### Question

What is the difference between the Application layer and the Persistence layer in this codebase?

### Current Understanding

Application layer means the use-case layer.

It owns:

- command/query records
- command/query handlers
- validators
- application DTOs
- store/port interfaces needed by handlers
- use-case orchestration

Persistence layer means the concrete data access implementation.

It owns:

- EF Core `DbContext` usage
- query/projection implementation
- actual insert/update/delete mechanics
- schema patch/bootstrap details
- persistence adapter classes that implement application ports

### Concrete Example

Current flow:

```text
CreateBlogCommandHandler
    -> IBlogCommandStore
        -> BlogCommandStore
            -> WoongBlogDbContext
                -> PostgreSQL
```

`IBlogCommandStore` belongs to Application because it is the contract the use-case needs.

`BlogCommandStore` belongs to Persistence because it implements that contract using EF Core.

### Boundary Rule

Application should depend on abstractions, not concrete persistence.

Good:

```text
CreateBlogCommandHandler -> IBlogCommandStore
```

Avoid:

```text
CreateBlogCommandHandler -> BlogCommandStore
CreateBlogCommandHandler -> WoongBlogDbContext
```

### Decision

Keep the current dependency direction:

```text
Application defines port/interface.
Persistence implements it.
Handler depends on the port/interface.
```

## Candidate 10 - Why the Old AdminBlogService Was Ambiguous

### Question

Why was `AdminBlogService` ambiguous before the refactor?

### Previous State

`AdminBlogService` lived under:

```text
Modules/Content/Blogs/Persistence/AdminBlogService.cs
```

Its namespace was:

```csharp
namespace WoongBlog.Api.Modules.Content.Blogs.Persistence;
```

It injected:

```csharp
WoongBlogDbContext
```

So by location and dependency, it looked like Persistence.

### Actual Responsibilities It Had

Despite living in Persistence, it also owned application use-case behavior.

It performed:

- admin list projection
- admin detail projection
- create blog use-case
- update blog use-case
- delete blog use-case
- slug generation
- excerpt generation
- publish timestamp rule
- entity construction/mutation
- `DbContext` add/remove/query
- `SaveChangesAsync`
- `AdminMutationResult` / `AdminActionResult` creation

### Why This Was Ambiguous

The class mixed multiple layers:

```text
Application use-case
Persistence query
Persistence mutation
DTO projection
Domain/entity mutation
Slug policy
Transaction save
```

The old handler was mostly a thin wrapper:

```csharp
public async Task<AdminMutationResult> Handle(CreateBlogCommand request, CancellationToken cancellationToken)
{
    return await _adminBlogService.CreateAsync(request, cancellationToken);
}
```

So the real use-case lived inside a class named and located like a persistence service.

### Before

```text
Endpoint
  -> CreateBlogCommandHandler
      -> IAdminBlogService.CreateAsync(CreateBlogCommand)
          -> AdminBlogService
              -> slug generation
              -> excerpt generation
              -> Blog entity creation
              -> DbContext.Blogs.Add
              -> SaveChangesAsync
```

### After

```text
Endpoint
  -> CreateBlogCommandHandler
      -> slug generation
      -> excerpt generation
      -> Blog entity creation
      -> IBlogCommandStore.Add
      -> IBlogCommandStore.SaveChangesAsync
          -> BlogCommandStore
              -> DbContext.Blogs.Add
              -> SaveChangesAsync
```

### Assessment

The previous `AdminBlogService` was not purely wrong, but its responsibility boundary was too broad.

It was effectively:

```text
Persistence-located application service with direct EF access
```

The current structure is clearer:

```text
Handler = Application use-case orchestration
CommandStore = persistence write adapter
QueryStore = persistence read adapter
```

### Decision

Do not reintroduce broad `Admin*Service` / `Public*Service` classes for Content CRUD.

If shared application policy is needed, introduce small focused services such as:

- `ContentSlugGenerator`
- `ContentSearchIndexUpdater`
- `TimeProvider` / `IClock`

Do not recreate a large service that owns use-case, persistence, projection, and transaction all together.
