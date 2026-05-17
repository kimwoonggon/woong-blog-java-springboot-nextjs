# Backend Test Inventory

Generated from `backend/src/test/java`.

Static declared test methods count each `@Test`, `@ParameterizedTest`, `@RepeatedTest`, and `@TestFactory` method once. Runtime CI suite scripts print actual Surefire execution counts separately, so parameterized invocations may be higher than this static number.

- Total backend test classes: 42
- Total declared backend test methods: 198

## Suite Counts

| Suite tag | Classes | Declared test methods |
|---|---:|---:|
| architecture | 1 | 5 |
| component | 1 | 1 |
| contract | 1 | 1 |
| integration | 2 | 16 |
| unit | 30 | 141 |
| web | 7 | 34 |

## Test Classes

| Class | Suite tag(s) | Declared test methods |
|---|---|---:|
| `com.woongblog.BackendApplicationTest` | unit | 1 |
| `com.woongblog.BackendApplicationTests` | integration | 1 |
| `com.woongblog.ai.AiControllerCqrsWebMvcTests` | web | 4 |
| `com.woongblog.ai.AiServiceTests` | unit | 10 |
| `com.woongblog.api.admin.AdminContentControllerWebMvcTests` | web | 4 |
| `com.woongblog.api.publicapi.PublicContentControllerWebMvcTests` | web | 1 |
| `com.woongblog.application.ai.AiApplicationHandlersTests` | unit | 7 |
| `com.woongblog.application.composition.GetDashboardSummaryQueryHandlerTest` | unit | 1 |
| `com.woongblog.application.content.blogs.DeleteBlogCommandHandlerTest` | unit | 1 |
| `com.woongblog.application.content.blogs.GetBlogsQueryHandlerTest` | unit | 1 |
| `com.woongblog.application.content.works.DeleteWorkCommandHandlerTest` | unit | 1 |
| `com.woongblog.application.media.JdbcWorkVideoStoreTest` | unit | 6 |
| `com.woongblog.application.media.WorkVideoCommandHandlersTest` | unit | 5 |
| `com.woongblog.application.site.GetResumeQueryHandlerTest` | unit | 1 |
| `com.woongblog.architecture.CqrsArchitectureTest` | architecture | 5 |
| `com.woongblog.common.ApiExceptionHandlerTest` | unit | 6 |
| `com.woongblog.common.JdbcDataTest` | unit | 10 |
| `com.woongblog.common.JsonSupportTest` | unit | 7 |
| `com.woongblog.common.PagedResponseTest` | unit | 3 |
| `com.woongblog.common.SlugSupportTest` | unit | 1 |
| `com.woongblog.component.AuthConfigurationComponentTest` | component | 1 |
| `com.woongblog.config.AppPropertiesTest` | unit | 2 |
| `com.woongblog.config.SecurityConfigTest` | unit | 2 |
| `com.woongblog.config.WebConfigTest` | unit | 2 |
| `com.woongblog.content.ContentServiceBehaviorTests` | unit | 13 |
| `com.woongblog.content.ContentServiceQueryTests` | unit | 3 |
| `com.woongblog.content.ContentServiceVideoSqlTests` | unit | 1 |
| `com.woongblog.content.DbSeederTests` | unit | 1 |
| `com.woongblog.contract.PactProviderContractTest` | contract | 1 |
| `com.woongblog.diagnostics.DiagnosticsControllerTest` | web | 5 |
| `com.woongblog.diagnostics.K6RealLoadTestExecutorTest` | unit | 2 |
| `com.woongblog.diagnostics.RealLoadTestServiceTest` | unit | 11 |
| `com.woongblog.diagnostics.RuntimeDiagnosticsServiceTest` | unit | 3 |
| `com.woongblog.identity.CookieAuthenticationFilterTest` | unit | 4 |
| `com.woongblog.identity.CsrfValidationFilterTest` | unit | 4 |
| `com.woongblog.identity.IdentityControllerWebMvcTest` | web | 9 |
| `com.woongblog.identity.IdentityServiceTest` | unit | 9 |
| `com.woongblog.identity.OAuthLoginSuccessHandlerTest` | unit | 4 |
| `com.woongblog.integration.ApiParityIntegrationTests` | integration | 15 |
| `com.woongblog.media.MediaControllerWebMvcTest` | web | 4 |
| `com.woongblog.media.MediaServiceTest` | unit | 19 |
| `com.woongblog.media.WorkVideoControllerWebMvcTest` | web | 7 |
