# ASP.NET Core Backend Test Inventory

- Source repository: https://github.com/kimwoonggon/woong-blog-aspcore-nextjs
- Source branch: dev
- Source commit: 5a2c3095890592384a5038ff3c1c1cb0a715c533
- Source path: /tmp/woong-blog-aspcore-nextjs-dev-analysis-20260517/backend/tests
- Generated date: 2026-05-17

Static declared test methods count each xUnit `[Fact]`, `[Theory]`, and custom attributes derived from those names once. Runtime xUnit discovery can be higher because each theory data row executes separately.

- Total backend test classes: 41
- Total declared backend test methods: 390

## Suite Counts

| Suite | Classes | Declared test methods |
|---|---:|---:|
| unit | 7 | 27 |
| integration | 17 | 199 |
| architecture | 3 | 37 |
| component | 13 | 126 |
| contract | 1 | 1 |

## Test Classes And Methods

### unit

#### AdminContentTextTests
- File: `backend/tests/WoongBlog.Api.UnitTests/AdminContentTextTests.cs`
- Declared methods: 2
- Fact: `GenerateExcerpt_Removes_MermaidBlocks_And_Preserves_AdjacentText` (line 8)
- Fact: `GenerateExcerpt_DoesNotTreatPlainFencesAsManagedMermaidBlocks` (line 27)

#### AiHttpResultMapperTests
- File: `backend/tests/WoongBlog.Api.UnitTests/AiHttpResultMapperTests.cs`
- Declared methods: 5
- Fact: `ToHttpResult_WithOkStatus_ReturnsHttp200` (line 11)
- Fact: `ToHttpResult_WithBadRequestStatus_ReturnsHttp400WithErrorBody` (line 19)
- Fact: `ToHttpResult_WithNotFoundStatus_ReturnsHttp404` (line 28)
- Fact: `ToHttpResult_WithConflictStatus_ReturnsHttp409WithErrorBody` (line 36)
- Fact: `ToHttpResult_WithUnknownStatus_ReturnsHttp500` (line 45)

#### GetPageBySlugQueryValidatorTests
- File: `backend/tests/WoongBlog.Api.UnitTests/GetPageBySlugQueryValidatorTests.cs`
- Declared methods: 2
- Fact: `Should_Have_Error_When_Slug_Is_Empty` (line 10)
- Fact: `Should_Not_Have_Error_When_Slug_Is_Valid` (line 18)

#### PublicContentBodyDtoTests
- File: `backend/tests/WoongBlog.Api.UnitTests/PublicContentBodyDtoTests.cs`
- Declared methods: 2
- Fact: `FromStoredFields_ReturnsOnlyMarkdown_WhenBothStoredSourcesExist` (line 8)
- Fact: `FromStoredFields_ReturnsHtml_WhenMarkdownIsMissing` (line 17)

#### RequestValidatorTests
- File: `backend/tests/WoongBlog.Api.UnitTests/RequestValidatorTests.cs`
- Declared methods: 6
- Fact: `SaveWorkRequestValidator_Rejects_Empty_Title_Category_And_Content` (line 13)
- Fact: `SaveBlogRequestValidator_Rejects_TooLong_Title_And_Tag` (line 35)
- Fact: `UpdatePageRequestValidator_Rejects_Empty_Id_TooLong_Title_And_Empty_Content` (line 52)
- Fact: `UpdateSiteSettingsCommandValidator_Rejects_Empty_ResumeAssetId_WhenProvided` (line 67)
- Theory: `GetWorkBySlugQueryValidator_Rejects_Empty_Slug` (line 86)
- Theory: `GetBlogBySlugQueryValidator_Rejects_Empty_Slug` (line 97)

#### WorkVideoHlsJobPlanTests
- File: `backend/tests/WoongBlog.Api.UnitTests/WorkVideoHlsJobPlanTests.cs`
- Declared methods: 3
- Fact: `Create_BuildsHlsStoragePathsAndSanitizedVideoEntity` (line 9)
- Fact: `ToWorkVideo_OmitsTimelinePreviewKeys_WhenPreviewWasNotGenerated` (line 35)
- Fact: `Create_WithR2Storage_EmbedsUnderlyingStorageInHlsSourceKey` (line 46)

#### WorkVideoPolicyTests
- File: `backend/tests/WoongBlog.Api.UnitTests/WorkVideoPolicyTests.cs`
- Declared methods: 7
- Theory: `NormalizeYouTubeVideoId_ReturnsId_ForSupportedInput` (line 64)
- Theory: `NormalizeYouTubeVideoId_ReturnsNull_ForUnsupportedInput` (line 73)
- Theory: `ValidateVideoFile_ReturnsError_ForInvalidUpload` (line 82)
- Theory: `ValidateVideoFile_ReturnsNull_ForSupportedUpload` (line 91)
- Theory: `LooksLikeMp4_ReturnsExpectedResult_ForPrefix` (line 101)
- Theory: `SanitizeOriginalFileName_ReturnsExpectedName` (line 110)
- Theory: `PublicVideosReadModel_Deserialize_ReturnsSharedEmptySnapshot_ForEmptyArray` (line 119)

### integration

#### AdminAiEndpointsTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/AdminAiEndpointsTests.cs`
- Declared methods: 17
- Fact: `AdminAiEndpoints_RejectAnonymousRequests` (line 24)
- Fact: `FixBlog_ReturnsBadRequest_WhenHtmlMissing` (line 45)
- Fact: `CreateBatchJob_ReturnsBadRequest_WhenNoTargetsRequested` (line 64)
- Fact: `FixBlog_ReturnsProviderPayload` (line 80)
- Fact: `FixBlog_ForwardsRequestedProvider` (line 107)
- Fact: `FixBlog_ForwardsCustomPrompt` (line 132)
- Fact: `FixBlogBatch_AppliesUpdatedHtml_WhenRequested` (line 157)
- Fact: `OpenApiDocument_ListsAdminAiEndpoints` (line 193)
- Fact: `RuntimeConfig_ReturnsConfiguredProviderMetadata` (line 206)
- Fact: `WorkEnrich_ReturnsProviderPayload` (line 222)
- Fact: `CreateBatchJob_ListsAndReturnsDetail` (line 249)
- Fact: `CreateBatchJob_RepeatedActiveSelectionReturnsExistingJob` (line 292)
- Fact: `BatchJob_PersistsAndAppliesCustomPrompt` (line 344)
- Fact: `BatchJob_CanBeCancelled` (line 406)
- Fact: `CompletedBatchJob_CanApplySuccessfulResults` (line 442)
- Fact: `CompletedBatchJob_CanBeRemoved` (line 506)
- Fact: `CompletedBatchJob_CanAutoApplySuccessfulResults` (line 561)

#### AdminContentEndpointsTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/AdminContentEndpointsTests.cs`
- Declared methods: 28
- Fact: `GetAdminPages_WithSlugFilter_ReturnsRequestedPageOnly` (line 23)
- Fact: `GetAdminPages_Home_ReturnsStructuredHomeContent` (line 36)
- Fact: `UpdateAdminPage_ReturnsBadRequest_WhenIdMissing` (line 69)
- Fact: `UpdateAdminPage_ReturnsNotFound_WhenPageMissing` (line 83)
- Fact: `UpdateSiteSettings_PersistsOwnerName` (line 98)
- Fact: `UpdateSiteSettings_ClearsResumeAsset_WhenExplicitlyNull` (line 118)
- Fact: `UpdateSiteSettings_PreservesResumeAsset_WhenResumeAssetIdIsOmitted` (line 146)
- Fact: `UpdateSiteSettings_ReturnsBadRequest_WhenResumeAssetIdIsEmptyGuid` (line 174)
- Fact: `CreateBlog_ReturnsBadRequest_WhenTitleMissing` (line 187)
- Fact: `CreateBlog_CreatesSlug_AndLeavesExcerptBlank_WhenNoManualExcerptIsProvided` (line 203)
- Fact: `CreateBlog_UsesManualExcerpt_WhenProvided` (line 230)
- Fact: `CreateAndReadBlog_PersistsUploadedCover` (line 256)
- Fact: `CreateBlog_LeavesExcerptBlank_WhenManualExcerptIsBlank` (line 293)
- Fact: `UpdateBlog_LeavesExcerptBlank_WhenManualExcerptIsBlank` (line 320)
- Fact: `UpdateBlog_PreservesStoredCover_WhenCoverAssetIdIsOmitted` (line 357)
- Fact: `UpdateBlog_ChangesAndClearsStoredCover_WhenCoverAssetIdIsProvided` (line 405)
- Fact: `CreateBlog_WithMarkdownOnlyContent_LeavesExcerptBlank` (line 478)
- Fact: `CreateBlog_WithWrappedMarkdownHtml_LeavesExcerptBlank` (line 499)
- Fact: `CreateBlog_WithDuplicateTitle_GeneratesUniqueSlug` (line 520)
- Fact: `UpdateBlog_ReturnsNotFound_WhenBlogMissing` (line 547)
- Fact: `CreateWork_ReturnsBadRequest_WhenCategoryMissing` (line 563)
- Fact: `CreateAndReadWork_FallsBackToEmptyObject_ForMalformedMetadata` (line 582)
- Fact: `CreateWork_WithDuplicateTitle_GeneratesUniqueSlug` (line 609)
- Fact: `CreateWork_StoresBodyImageThumbnailFallback_ForPublicReadModel` (line 642)
- Fact: `UpdateWork_ReturnsNotFound_WhenWorkMissing` (line 685)
- Fact: `UpdateWork_RecomputesBodyImageThumbnailFallback_ForPublicReadModel` (line 704)
- Fact: `UpdateWork_FallsBackToExistingVideo_WhenThumbnailAssetDoesNotResolve` (line 757)
- Fact: `CreateAndReadWork_PersistsUploadedThumbnailAndIcon` (line 821)

#### AdminDashboardEndpointsTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/AdminDashboardEndpointsTests.cs`
- Declared methods: 2
- Fact: `GetDashboardSummary_ReturnsCountsForAdmin` (line 16)
- Fact: `GetDashboardSummary_RejectsAnonymous` (line 30)

#### AdminEndpointsTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/AdminEndpointsTests.cs`
- Declared methods: 8
- Fact: `CreateWork_WithInvalidPayload_ReturnsBadRequest` (line 18)
- Fact: `CreateWork_ThenGetById_PersistsExcerptAndCategory` (line 34)
- Fact: `UpdatePage_PersistsNewHtmlContent` (line 62)
- Fact: `UpdateSiteSettings_PersistsOwnerName` (line 86)
- Fact: `CreateBlog_WithTooLongTitle_ReturnsBadRequest` (line 106)
- Fact: `CreateBlog_ThenDelete_RemovesBlog` (line 121)
- Fact: `GetAdminBlogById_ExtractsHtmlContent` (line 144)
- Fact: `GetAdminWorkById_UsesEmptyHtmlWhenContentJsonIsMalformed` (line 166)

#### AdminMembersEndpointsTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/AdminMembersEndpointsTests.cs`
- Declared methods: 2
- Fact: `GetMembers_ReturnsPrivacySafeMemberListForAdmin` (line 15)
- Fact: `GetMembers_RejectsAnonymous` (line 32)

#### AdminMutationEndpointsTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/AdminMutationEndpointsTests.cs`
- Declared methods: 17
- Theory: `AdminMutationEndpoints_WithValidCsrf_ButMissingAdminRole_ReturnAuthFailure` (line 22)
- Fact: `UpdatePage_WhenValid_PersistsTargetPageOnly` (line 51)
- Fact: `UpdatePage_WhenInvalid_ReturnsBadRequestAndDoesNotPersist` (line 98)
- Fact: `CreateBlog_WhenValid_PersistsExpectedFields` (line 130)
- Fact: `CreateBlog_WhenInvalid_ReturnsBadRequestAndDoesNotCreate` (line 167)
- Fact: `UpdateBlog_WhenExisting_PersistsExpectedFieldsAndCanUnpublish` (line 185)
- Fact: `UpdateBlog_WhenMissing_ReturnsNotFoundAndDoesNotAffectExistingBlogs` (line 223)
- Fact: `DeleteBlog_WhenExisting_RemovesOnlyTargetBlog` (line 248)
- Fact: `DeleteBlog_WhenMissing_ReturnsNotFoundAndDoesNotAffectBlogs` (line 268)
- Fact: `CreateWork_WhenValid_PersistsExpectedFields` (line 285)
- Fact: `CreateWork_WhenInvalid_ReturnsBadRequestAndDoesNotCreate` (line 328)
- Fact: `UpdateWork_WhenExisting_PersistsExpectedFieldsAndCanUnpublish` (line 349)
- Fact: `UpdateWork_WhenMissing_ReturnsNotFoundAndDoesNotAffectExistingWorks` (line 409)
- Fact: `DeleteWork_WhenExisting_RemovesOnlyTargetWork` (line 437)
- Fact: `DeleteWork_WhenMissing_ReturnsNotFoundAndDoesNotAffectWorks` (line 457)
- Fact: `UpdateSiteSettings_WhenPartialPayload_PreservesOmittedFields` (line 474)
- Fact: `UpdateSiteSettings_WhenInvalid_ReturnsBadRequestAndDoesNotPersist` (line 507)

#### AuthEndpointsTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/AuthEndpointsTests.cs`
- Declared methods: 6
- Fact: `GetSession_WhenAnonymous_ReturnsUnauthenticated` (line 16)
- Fact: `GetSession_WhenAuthenticated_ReturnsAdminSession` (line 29)
- Fact: `GetCsrf_ReturnsRequestToken` (line 43)
- Fact: `TestLogin_IsNotRateLimitedByTheApplication` (line 57)
- Fact: `Session_IsNotRateLimited_WhenFlooded` (line 76)
- Fact: `LogoutGet_ReturnsMethodNotAllowed` (line 92)

#### AuthFlowIntegrationTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/AuthFlowIntegrationTests.cs`
- Declared methods: 12
- Fact: `GetSession_WhenAdminHeaderPresent_ReturnsFullAdminPayload` (line 19)
- Fact: `GetSession_WhenNonAdminHeaderPresent_ReturnsAuthenticatedUserRole` (line 37)
- Theory: `AdminGetEndpoints_WhenAnonymous_ReturnUnauthorized` (line 59)
- Theory: `AdminGetEndpoints_WhenAuthenticatedWithoutAdminRole_ReturnForbidden` (line 80)
- Theory: `AdminGetEndpoints_WhenAuthenticatedAsAdmin_ReturnSuccess` (line 101)
- Fact: `Login_WhenAuthConfigured_ChallengesFakeOidcProvider` (line 118)
- Fact: `Login_WhenReturnUrlIsExternal_DoesNotExposeExternalRedirectTarget` (line 138)
- Fact: `LogoutPost_WhenCsrfMissing_ReturnsBadRequest` (line 155)
- Fact: `LogoutPost_WhenCsrfValid_ReturnsRedirectPayloadAndClearsAuthCookie` (line 165)
- Fact: `UpdateSiteSettings_WhenCsrfTokenInvalid_ReturnsBadRequestAndDoesNotPersist` (line 182)
- Fact: `UpdateSiteSettings_WhenCsrfTokenValid_PersistsMutation` (line 209)
- Theory: `AdminMutation_WhenCsrfTokenValidButPrincipalIsNotAdmin_ReturnsAuthFailure` (line 227)

#### AuthSecurityTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/AuthSecurityTests.cs`
- Declared methods: 3
- Fact: `UpdateSiteSettings_WithoutCsrf_ReturnsBadRequest` (line 16)
- Fact: `UpdateSiteSettings_WithCsrf_ReturnsOk` (line 29)
- Fact: `Session_Response_ContainsSecurityHeaders` (line 49)

#### DatabaseBootstrapperTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/DatabaseBootstrapperTests.cs`
- Declared methods: 3
- Fact: `InitializeAsync_SeedsContractData_AndCanBeCalledTwice` (line 19)
- Fact: `InitializeAsync_Rehydrates_Public_Detail_Seeds_When_Runtime_Data_Already_Exists` (line 42)
- Fact: `InitializeAsync_Reuses_Existing_Seeded_WorkVideo_Slots_When_Runtime_Data_Already_Exists` (line 66)

#### PersistenceContractTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/PersistenceContractTests.cs`
- Declared methods: 3
- Fact: `ModelConfiguration_KeepsExpectedJsonAndUniquenessContracts` (line 27)
- Fact: `SaveChanges_PopulatesContentSearchFields` (line 88)
- Fact: `SeedData_SeedsCoreContractData_OnlyOnce` (line 132)

#### PostgresPersistenceContractTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/PostgresPersistenceContractTests.cs`
- Declared methods: 17
- Fact: `Bootstrapper_AppliesPostgresSpecificSearchSchema` (line 30)
- Fact: `Bootstrapper_RebuildsLegacyWideWorkPublicListCoveringIndex` (line 143)
- Fact: `Bootstrapper_BackfillsVideosVersion_ForExistingWorkVideos` (line 184)
- Fact: `Bootstrapper_BackfillsPublicVideosJson_ForExistingWorkVideos` (line 226)
- Fact: `Bootstrapper_BackfillsPublicThumbnailUrl_FromLegacyFallbacks` (line 279)
- Fact: `Bootstrapper_IsIdempotentAndPreservesRuntimeData_WithPostgres` (line 358)
- Fact: `RelationalConstraints_EnforceRequiredUniqueAndCascadeContracts` (line 382)
- Fact: `CommandDiagnosticsInterceptor_RecordsAsyncEfCommands_WithPostgres` (line 485)
- Fact: `PublicWorkDetail_UsesStoredSocialShareMessage_WithPostgres` (line 521)
- Fact: `PublicWorkDetailWithoutVideos_UsesSinglePostgresCommand_AndResolverEquivalentStoredThumbnail` (line 564)
- Fact: `PublicWorkDetailWithoutVideos_DoesNotReferenceWorkVideosInDetailProjection` (line 626)
- Fact: `PublicWorkDetailWithVideos_UsesSinglePostgresCommand_AndStoredPublicColumnsOnly` (line 653)
- Fact: `PublicBlogDetail_UsesSinglePostgresCommand` (line 769)
- Fact: `PublicWorkFirstPage_UsesSinglePostgresCommand_ForNoSearchList` (line 796)
- Fact: `PublicBlogFirstPage_UsesSinglePostgresCommand_ForNoSearchList` (line 883)
- Fact: `PublicHome_UsesThreePostgresCommands_ForShellAndSummaryProjections` (line 913)
- Fact: `AdminWorkList_UsesSinglePostgresCommand_AndStoredThumbnail` (line 976)

#### PublicEndpointsTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/PublicEndpointsTests.cs`
- Declared methods: 33
- Fact: `GetApiHealth_ReturnsOk` (line 31)
- Fact: `GetPublicSiteSettings_ReturnsSeededOwnerName` (line 41)
- Fact: `GetPublicSiteSettings_ReturnsPublicDtoShape_ForAnonymousClient` (line 54)
- Fact: `GetPublicHome_ReturnsFeaturedCollections` (line 75)
- Fact: `GetPublicHome_ReturnsPublicDtoShape_ForAnonymousClient` (line 90)
- Fact: `GetPageBySlug_ReturnsSerializedPage_ForAnonymousClient` (line 118)
- Fact: `GetPageBySlug_ReturnsNotFound_WhenMissing` (line 136)
- Fact: `GetWorkBySlug_ReturnsSeededDetail` (line 146)
- Fact: `GetWorkBySlug_ReturnsSerializedDetailWithMedia_ForAnonymousClient` (line 160)
- Fact: `GetWorkBySlug_ReturnsPublicContentBodyWithoutAdminContentJson` (line 190)
- Fact: `GetWorkBySlug_CompressesPublicDetailJson_WhenClientAcceptsGzip` (line 234)
- Fact: `GetWorkBySlug_OmitsNullOptionalVideoFields` (line 282)
- Fact: `GetWorkBySlug_ReturnsNotFound_WhenMissing` (line 343)
- Fact: `GetWorkBySlug_ReturnsNotFound_WhenWorkIsDraft` (line 353)
- Fact: `GetWorkDetailContext_ReturnsBoundedPublicContext_AndNotFoundForMissingSlug` (line 383)
- Fact: `GetPublicWorks_FiltersDraftsOrdersByPublishedDateAndMapsAssets` (line 415)
- Fact: `GetPublicWorks_ReturnsPagedPayloadShape` (line 499)
- Fact: `GetPublicWorks_FiltersByTitleSearch` (line 517)
- Fact: `GetPublicWorks_FiltersByContentSearch` (line 552)
- Fact: `GetPublicWorks_QueryOnly_UsesUnifiedSearch` (line 588)
- Fact: `GetPublicBlogs_ReturnsPagedPayloadShape` (line 643)
- Fact: `GetPublicBlogs_FiltersByTitleSearch` (line 659)
- Fact: `GetPublicBlogs_FiltersByContentSearch` (line 692)
- Fact: `GetPublicBlogs_QueryOnly_UsesUnifiedSearch` (line 726)
- Fact: `GetBlogBySlug_ReturnsNotFound_WhenMissing` (line 777)
- Fact: `GetBlogBySlug_ReturnsSerializedDetailWithCover_ForAnonymousClient` (line 787)
- Fact: `GetBlogBySlug_ReturnsPublicContentBodyWithoutAdminContentJson` (line 808)
- Fact: `GetBlogBySlug_ReturnsNotFound_WhenBlogIsDraft` (line 850)
- Fact: `GetBlogDetailContext_ReturnsBoundedPublicContext_AndNotFoundForMissingSlug` (line 878)
- Fact: `GetPublicBlogs_FiltersDraftsOrdersByPublishedDateAndMapsAssets` (line 910)
- Fact: `GetPublicListEndpoints_ReturnStableEmptyResponses_WhenContentTablesAreEmpty` (line 984)
- Fact: `GetPublicResume_ReturnsSeededResumeUrl` (line 1018)
- Fact: `SeededAdminProfile_Exists` (line 1031)

#### StartupCompositionTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/StartupCompositionTests.cs`
- Declared methods: 17
- Fact: `Root_RedirectsToHealthEndpoint` (line 85)
- Fact: `ServiceProvider_ResolvesImportantApiApplicationAndInfrastructureServices` (line 99)
- Fact: `PersistenceRegistration_PoolsDbContextInstancesAndResetsStateAcrossScopes` (line 156)
- Fact: `ServiceProvider_ResolvesImportantApplicationHandlersAndValidators` (line 197)
- Fact: `JsonOptions_UseSourceGeneratedMetadataForPublicHotPathDtos` (line 250)
- Fact: `JsonOptions_UseSourceGeneratedSerializationForPublicHotPathDtos` (line 262)
- Fact: `UploadLimits_AllowConfiguredWorkVideoMaximumBeforeAppValidation` (line 274)
- Fact: `AuthOptions_Use300MinuteSlidingExpiration_AndEightHourAbsoluteExpiration` (line 292)
- Fact: `Options_AreBoundForTestingStartup` (line 302)
- Fact: `HealthOpenApiAndRuntimeConfig_StartWithoutExternalServicesInTesting` (line 327)
- Fact: `LoadTestDiagnostics_RequiresAdminAuthorization` (line 425)
- Fact: `RealLoadTestControlPlane_EndpointsRequireAdminAuthorization` (line 435)
- Fact: `RealLoadTestControlPlane_StartStatusMetricsAndStop_HappyPath_WhenRealRunnerDisabled_ForcesFakeRunner` (line 479)
- Fact: `RealLoadTestControlPlane_StartRejectsSpikePeakRateBelowBaseRate` (line 589)
- Fact: `RealLoadTestControlPlane_RealRunnerDisabledFallsBackToFakeRunner` (line 616)
- Fact: `LoadTestDiagnostics_WhenDbCollectorThrows_ReturnsErrorDatabasePayload` (line 669)
- Fact: `UnsafeAdminMutationWithoutCsrf_IsRejectedBeforeAuthorization` (line 700)

#### StartupOptionsValidationTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/StartupOptionsValidationTests.cs`
- Declared methods: 8
- Fact: `CurrentTestingConfiguration_RemainsValid` (line 12)
- Fact: `InvalidProxyNetwork_FailsAtStartup` (line 23)
- Fact: `InvalidAuthPublicOrigin_FailsAtStartup` (line 37)
- Fact: `InvalidAiProvider_FailsAtStartup` (line 51)
- Fact: `InvalidAiBatchConcurrency_FailsAtStartup` (line 65)
- Fact: `MissingRequiredAuthStoragePath_FailsAtStartup` (line 79)
- Fact: `MissingSecurityAntiforgeryHeaderName_FailsAtStartup` (line 93)
- Fact: `ProductionAuthWithoutCredentials_FailsAtStartup` (line 107)

#### UploadsControllerTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/UploadsControllerTests.cs`
- Declared methods: 4
- Fact: `Upload_WithoutFile_ReturnsBadRequest` (line 21)
- Fact: `Upload_Pdf_CreatesAsset_AndDelete_RemovesIt` (line 33)
- Fact: `Upload_UnsupportedImage_ReturnsBadRequest` (line 70)
- Fact: `Delete_MissingAsset_ReturnsNotFound` (line 88)

#### WorkVideoEndpointsTests
- File: `backend/tests/WoongBlog.Api.IntegrationTests/WorkVideoEndpointsTests.cs`
- Declared methods: 19
- Fact: `AddYouTubeVideo_PersistsAndProjectsToAdminAndPublic` (line 30)
- Fact: `AddYouTubeVideo_RecomputesFallback_WhenThumbnailAssetDoesNotResolve` (line 78)
- Theory: `UploadUrl_WithValidCsrfButMissingAdminRole_ReturnsAuthFailure` (line 127)
- Fact: `UploadUrl_ReturnsNotFound_WhenWorkIsMissing` (line 147)
- Fact: `UploadUrl_ReturnsBadRequest_WhenFileMetadataIsInvalid` (line 165)
- Fact: `UploadLocal_ReturnsBadRequest_WhenFileIsMissing` (line 184)
- Fact: `LocalUploadConfirm_PersistsMetadataStoresFileAndProjectsPublicVideo` (line 201)
- Fact: `LocalUploadConfirmAndDeleteWork_EnqueuesCleanupAndRemovesVideoRows` (line 252)
- Fact: `DeleteWorkVideo_RemovesRecordAndSchedulesStorageCleanup` (line 305)
- Fact: `DeleteWorkVideo_ReturnsNotFound_WhenVideoIsMissing` (line 342)
- Fact: `DeleteYouTubeVideo_RecomputesBodyImageThumbnailFallback_ForPublicReadModel` (line 355)
- Fact: `FfmpegVideoTranscoder_SegmentsHlsAndProducesTheManifest` (line 398)
- Fact: `HlsJob_StoresManifestAndProjectsPlaybackUrl` (line 449)
- Fact: `HlsJob_DeleteThenReupload_ReturnsPreviewCapablePayloadWhenPreviewAssetsExist` (line 507)
- Fact: `ReorderWorkVideos_ReturnsConflictWhenVideosVersionIsStale` (line 563)
- Fact: `ReorderWorkVideos_PersistsUpdatedPublicAndAdminOrder` (line 587)
- Fact: `ReorderWorkVideos_ReturnsBadRequest_WhenPayloadContainsInvalidIds` (line 656)
- Fact: `PublicWorkVideoQuery_ReturnsPublishedVideoDataAndHidesDraftWorkVideos` (line 700)
- Fact: `ExpireUploadSessions_MarksSessionAndEnqueuesCleanup` (line 784)

### architecture

#### ArchitectureBoundaryTests
- File: `backend/tests/WoongBlog.Api.ArchitectureTests/ArchitectureBoundaryTests.cs`
- Declared methods: 31
- Fact: `Backend_IsSplitIntoExpectedProductionAssemblies` (line 27)
- Fact: `Production_ProjectReferences_FollowLayeredDirection` (line 37)
- Fact: `Application_DoesNotReference_InfrastructureOrApi` (line 56)
- Fact: `Domain_DoesNotReference_ApplicationInfrastructureOrApi` (line 65)
- Fact: `Domain_DoesNotReference_FrameworkOrHigherLayerAssemblies` (line 75)
- Fact: `Application_DoesNotReference_HttpPersistenceOrInfrastructureConcepts` (line 94)
- Fact: `Application_Source_DoesNotUseHttpResultsOrServiceLocator` (line 113)
- Fact: `Application_DoesNotExpose_AspNetCoreHttpResultTypes` (line 142)
- Fact: `Application_DoesNotUse_ServiceScopeFactoryOrServiceLocator` (line 150)
- Fact: `Application_ResultTypes_RemainHttpAgnostic` (line 174)
- Fact: `Http_Adapters_DoNotDirectlyDependOn_DbContext` (line 198)
- Fact: `Composition_Registration_Extensions_Exist_For_Approved_Boundaries` (line 214)
- Fact: `Program_ComposesServicesMiddlewareAndEndpoints_InExpectedBoundaryOrder` (line 248)
- Fact: `Legacy_Actor_Zones_Are_Removed` (line 302)
- Fact: `Centralized_Page_Controller_And_Request_Model_Are_Removed` (line 320)
- Fact: `Centralized_Blog_Controller_And_Request_Model_Are_Removed` (line 327)
- Fact: `Centralized_Work_Controller_And_Request_Model_Are_Removed` (line 334)
- Fact: `Centralized_Public_Site_And_Dashboard_Controllers_And_Request_Model_Are_Removed` (line 341)
- Fact: `Centralized_Identity_And_Media_Controllers_Are_Removed` (line 350)
- Fact: `Module_Persistence_Types_DoNot_Depend_On_Other_Module_Persistence_Types` (line 358)
- Fact: `Content_Handlers_DoNot_Depend_On_Actor_Facade_Services` (line 381)
- Fact: `Cross_Module_Actor_Facade_Service_Types_Are_Removed` (line 412)
- Fact: `WorkVideo_Application_Result_DoesNot_Use_AspNetCore_StatusCodes` (line 439)
- Fact: `Works_GetWorkBySlug_Uses_New_Application_Namespace_Phase1` (line 465)
- Fact: `Identity_Application_Subset_Uses_New_Namespace_Phase1` (line 494)
- Fact: `Ai_Application_Types_DoNot_Directly_Use_ServiceScopeFactory_Or_ServiceLocator` (line 523)
- Fact: `Content_Application_Abstractions_DoNot_Accept_MediatR_Request_Types` (line 549)
- Fact: `WorkVideo_CommandStore_DoesNotExpose_BackgroundCleanupResponsibilities` (line 568)
- Fact: `Ai_Batch_AggregateBatchStore_IsRemoved` (line 590)
- Fact: `Api_ModuleRegistrations_DoNotReference_ConcreteInfrastructureAdapters` (line 602)
- Fact: `UnitTestProject_DoesNotReference_Infrastructure_AspNetCore_Or_EfInMemory` (line 633)

#### BackendCoverageToolingTests
- File: `backend/tests/WoongBlog.Api.ArchitectureTests/BackendCoverageToolingTests.cs`
- Declared methods: 4
- Fact: `BackendCoverageScript_ExposesExpectedSuitesAndOutputLayout` (line 9)
- Fact: `BackendCoverageRunsettings_InstrumentsProductionAssembliesOnly` (line 27)
- Fact: `BackendReportGeneratorTool_IsPinnedInLocalManifest` (line 52)
- Fact: `BackendTestingDocumentation_ExplainsCoverageUseAndLimits` (line 71)

#### NginxRuntimeConfigTests
- File: `backend/tests/WoongBlog.Api.ArchitectureTests/NginxRuntimeConfigTests.cs`
- Declared methods: 2
- Theory: `ApiProxyLocations_AllowLongRunningHlsJobs` (line 21)
- Fact: `MainRuntimeAllowlist_IncludesEveryNginxConfigUnderArchitectureCoverage` (line 40)

### component

#### AiBatchRuntimeComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/AiBatchRuntimeComponentTests.cs`
- Declared methods: 10
- Fact: `CreateBlogFixBatchJobCommandHandler_PersistsQueuedJobAndPendingItemsForSelectedTargets` (line 20)
- Fact: `AiBlogFixBatchStore_SelectsRequestedTargetsOrAllTargetsDeterministically` (line 71)
- Fact: `AiBatchJobScheduler_ResetRunningJobs_RequeuesInterruptedJobs` (line 88)
- Fact: `AiBatchJobScheduler_ProcessQueuedJobsUntilEmpty_CompletesSuccessfulJobAndPersistsResult` (line 104)
- Fact: `AiBatchJobScheduler_ProcessQueuedJobsUntilEmpty_RepresentsPartialFailuresWithoutCorruptingOtherBlogs` (line 147)
- Fact: `AiBatchJobScheduler_ProcessQueuedJobsUntilEmpty_MarksJobFailedWhenEveryRuntimeCallFails` (line 194)
- Fact: `GetAiRuntimeConfigQueryHandler_ReturnsStableDefaultsAndPromptMetadata` (line 222)
- Fact: `GetAiRuntimeConfigQueryHandler_FallsBackSafelyWhenConfiguredProviderIsUnavailable` (line 248)
- Fact: `AiOptionsPostConfigure_LoadsEnvironmentStyleOverridesAndStableDefaults` (line 264)
- Fact: `AiOptionsValidator_FailsSafelyForInvalidRuntimeConfiguration` (line 292)

#### AuthRecorderComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/AuthRecorderComponentTests.cs`
- Declared methods: 12
- Fact: `RecordSuccessfulLogin_CreatesProfileSessionAndAuditLog` (line 23)
- Fact: `RecordSuccessfulLogin_KeepsUserRole_WhenNoAdminOverrideOrMatchingEmailExists` (line 52)
- Fact: `RecordLogout_RevokesSessionAndAddsAuditLog` (line 78)
- Fact: `ValidateSessionAsync_ReturnsFalse_WhenClaimsMissing` (line 108)
- Fact: `ValidateSessionAsync_ReturnsFalse_WhenSessionIdClaimIsMalformed` (line 121)
- Fact: `ValidateSessionAsync_ReturnsFalse_WhenSessionRevoked` (line 139)
- Fact: `ValidateSessionAsync_ReturnsTrue_AndUpdatesLastSeen_WhenSessionValid` (line 178)
- Fact: `ValidateSessionAsync_ReturnsTrue_WithoutUpdatingLastSeen_WhenSessionRecentlySeen` (line 223)
- Fact: `ValidateSessionAsync_ReturnsFalse_WhenSessionExpired` (line 268)
- Fact: `ValidateSessionAsync_ReturnsFalseAndRevokesSession_WhenAbsoluteExpirationHasPassed` (line 312)
- Fact: `ValidateSessionAsync_ReturnsFalseAndRevokesSession_WhenProfileIsMissing` (line 357)
- Fact: `ValidateSessionAsync_ReturnsFalse_WhenRoleDrifts` (line 388)

#### AuthRedirectUriResolverComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/AuthRedirectUriResolverComponentTests.cs`
- Declared methods: 2
- Fact: `ResolveCallbackUri_UsesConfiguredPublicOrigin_WhenPresent` (line 9)
- Fact: `ResolveCallbackUri_FallsBackToRequestOrigin_WhenPublicOriginMissing` (line 25)

#### BlogAiFixServiceCodexRuntimeComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/BlogAiFixServiceCodexRuntimeComponentTests.cs`
- Declared methods: 6
- Fact: `GetAvailableProviders_WithCodexCommand_IncludesOpenAiAndCodexChoices` (line 11)
- Fact: `FixHtmlAsync_WithCodexProvider_FailsClearlyWhenCodexHomeIsFile` (line 23)
- Fact: `FixHtmlAsync_WithCodexProvider_ExportsConfiguredOpenAiKeyToCodexProcess` (line 50)
- Fact: `FixHtmlAsync_WithCodexProvider_CreatesCodexHomeAndExportsItToProcess` (line 90)
- Fact: `FixHtmlAsync_WithCodexProvider_PassesModelReasoningAndWorkdirToFakeProcess` (line 130)
- Fact: `FixHtmlAsync_WithCodexProvider_ThrowsWhenFakeProcessReturnsNonZeroExit` (line 191)

#### BlogAiFixServiceProviderComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/BlogAiFixServiceProviderComponentTests.cs`
- Declared methods: 16
- Fact: `FixHtmlAsync_WithOpenAiProvider_ReturnsCleanedMessageContentAndSendsConfiguredModel` (line 26)
- Fact: `FixHtmlAsync_WithOpenAiProvider_CleansHtmlFenceFromResponse` (line 51)
- Fact: `FixHtmlAsync_WithOpenAiProvider_ThrowsWithPayloadWhenResponseFails` (line 67)
- Fact: `FixHtmlAsync_WithOpenAiProvider_ThrowsWhenResponseJsonIsMalformed` (line 81)
- Theory: `FixHtmlAsync_WithOpenAiProvider_ReturnsEmptyHtmlWhenResponseHasNoMessageContent` (line 92)
- Fact: `FixHtmlAsync_WithOpenAiProvider_ThrowsWhenApiKeyIsMissing` (line 106)
- Fact: `FixHtmlAsync_WithUnknownProvider_FallsBackToOpenAi` (line 124)
- Fact: `FixHtmlAsync_WithOpenAiProvider_UsesOpenAiModelEnvironmentOverride` (line 143)
- Fact: `FixHtmlAsync_WithAzureProvider_ReturnsCleanedMessageContent` (line 163)
- Fact: `FixHtmlAsync_WithAzureProvider_BuildsUrlWithoutDoubleSlashAndSendsApiKeyHeader` (line 177)
- Fact: `FixHtmlAsync_WithAzureProvider_ThrowsWithPayloadWhenResponseFails` (line 206)
- Fact: `FixHtmlAsync_WithAzureProvider_ThrowsWhenResponseJsonIsMalformed` (line 220)
- Theory: `FixHtmlAsync_WithAzureProvider_ReturnsEmptyHtmlWhenResponseHasNoMessageContent` (line 231)
- Theory: `FixHtmlAsync_WithAzureProvider_ThrowsWhenApiKeyOrEndpointIsMissing` (line 245)
- Theory: `FixHtmlAsync_WithAzureProvider_UsesDeploymentEnvironmentOverride` (line 267)
- Fact: `FixHtmlAsync_WithAzureProvider_UsesApiVersionEnvironmentOverride` (line 284)

#### CodexRuntimeEnvironmentComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/CodexRuntimeEnvironmentComponentTests.cs`
- Declared methods: 2
- Fact: `FixHtmlAsync_CreatesCodexHomeDirectoryBeforeStartingCodex` (line 18)
- Fact: `FixHtmlAsync_FailsClearlyWhenCodexHomeIsAFile` (line 42)

#### DbContextModelContractComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/DbContextModelContractComponentTests.cs`
- Declared methods: 4
- Fact: `DbContext_ModelIncludesExpectedAggregateSetsAndKeys` (line 11)
- Fact: `DbContext_ModelDefinesRequiredJsonIndexAndUniquenessContracts` (line 34)
- Fact: `DbContext_ModelDefinesExpectedWorkVideoCascadeContracts` (line 94)
- Fact: `SaveChanges_RefreshesSearchFieldsWhenContentChanges` (line 109)

#### FfmpegVideoTranscoderComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/FfmpegVideoTranscoderComponentTests.cs`
- Declared methods: 1
- Fact: `SegmentHlsAsync_FallsBackToCompatibleTranscode_WhenCopyModeFails` (line 10)

#### PersistenceRuntimeDiagnosticsComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/PersistenceRuntimeDiagnosticsComponentTests.cs`
- Declared methods: 2
- Fact: `FromConfiguration_ExposesPostgresPoolSettingsWithoutSecrets` (line 9)
- Fact: `FromConfiguration_UsesNpgsqlDefaultsWhenPoolSizesAreNotConfigured` (line 32)

#### PublicQueryHandlerComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/PublicQueryHandlerComponentTests.cs`
- Declared methods: 43
- Fact: `GetHomeQueryHandler_ReturnsNull_WhenHomePageMissing` (line 70)
- Fact: `GetHomeQueryHandler_ReturnsOnlyPublishedContent` (line 89)
- Fact: `GetResumeQueryHandler_ReturnsNull_WhenResumeAssetMissing` (line 123)
- Fact: `GetSiteSettingsQueryHandler_ReturnsNull_WhenSettingsMissing` (line 143)
- Fact: `GetHomeQueryHandler_ReturnsNull_WhenSiteSettingsMissing` (line 154)
- Fact: `GetHomeQueryHandler_MapsHomeContentAndOrdersPublishedSummaries` (line 174)
- Fact: `GetHomeQueryHandler_ReturnsSixFeaturedWorksForBalancedDesktopHomeGrid` (line 246)
- Fact: `GetHomeQueryHandler_UsesStoredPublicMediaUrlsWithoutAssetRows` (line 285)
- Fact: `GetHomeQueryHandler_DoesNotUseWorkBodyImageAsFeaturedThumbnailFallback` (line 351)
- Fact: `GetHomeQueryHandler_DoesNotUseWorkVideoAsFeaturedThumbnailFallback` (line 396)
- Fact: `GetSiteSettingsQueryHandler_ReturnsAllPublicSocialFields` (line 451)
- Fact: `GetPageBySlugQueryHandler_ReturnsPageContent_WhenSlugExists` (line 483)
- Fact: `GetPageBySlugQueryHandler_ReturnsNull_WhenSlugIsMissing` (line 508)
- Fact: `GetWorksQueryHandler_SkipsDrafts_AndUsesStoredPublicMediaUrlsWithoutAssetRows` (line 519)
- Fact: `GetWorksQueryHandler_DoesNotUseWorkVideoAsPublicThumbnailFallback` (line 538)
- Fact: `GetWorksQueryHandler_ReturnsPagedResults` (line 580)
- Fact: `GetWorksQueryHandler_ReturnsStableEmptyPage_WhenNoWorksArePublished` (line 600)
- Fact: `GetWorksQueryHandler_FiltersDraftsOrdersByPublishedAtAndMapsStoredPublicMediaUrls` (line 618)
- Fact: `GetWorksQueryHandler_ClampsRequestedPageBeyondLastPage` (line 654)
- Fact: `GetWorksQueryHandler_FiltersByTitleSearch` (line 674)
- Fact: `GetWorksQueryHandler_FiltersByNormalizedTitleSearch` (line 692)
- Fact: `GetWorksQueryHandler_FiltersByContentSearch` (line 710)
- Fact: `GetWorksQueryHandler_QueryOnly_PerformsUnifiedSearch` (line 728)
- Fact: `GetHomeQueryHandler_ReturnsUpToSixRecentPosts` (line 750)
- Fact: `GetWorkBySlugQueryHandler_MapsSocialShareMessage_FromStoredPublicReadModel` (line 788)
- Fact: `GetWorkBySlugQueryHandler_ReturnsNullSocialShareMessage_WhenReservedKeyMissing` (line 817)
- Fact: `GetWorkBySlugQueryHandler_MapsTimelinePreviewUrls_ForHlsVideo` (line 845)
- Fact: `GetAdminWorkByIdQueryHandler_VerifiesTimelinePreviewAssets` (line 899)
- Fact: `GetWorkBySlugQueryHandler_ReturnsPublishedDetailWithStoredPublicMediaUrlsAndVideos` (line 950)
- Fact: `GetWorkBySlugQueryHandler_ReturnsVideosButDoesNotUseVideoAsPublicThumbnailFallback` (line 1027)
- Fact: `GetWorkBySlugQueryHandler_DoesNotUseBodyImageAsPublicThumbnailFallback` (line 1074)
- Fact: `GetWorkBySlugQueryHandler_ReturnsNull_ForDraftOrMissingSlug` (line 1105)
- Fact: `GetWorkDetailContextQueryHandler_ReturnsBoundedPublicContext_WithAdjacentItems` (line 1121)
- Fact: `GetAdminWorkByIdQueryHandler_OmitsTimelinePreviewUrls_WhenPreviewAssetsAreMissing` (line 1149)
- Fact: `GetBlogsQueryHandler_ReturnsPagedResults` (line 1199)
- Fact: `GetBlogsQueryHandler_ReturnsStableEmptyPage_WhenNoBlogsArePublished` (line 1219)
- Fact: `GetBlogsQueryHandler_FiltersDraftsOrdersByPublishedAtAndMapsStoredCoverUrl` (line 1237)
- Fact: `GetBlogsQueryHandler_ClampsRequestedPageBeyondLastPage` (line 1269)
- Fact: `GetBlogsQueryHandler_FiltersByNormalizedTitleSearch` (line 1289)
- Fact: `GetBlogsQueryHandler_QueryOnly_PerformsUnifiedSearch` (line 1307)
- Fact: `GetBlogBySlugQueryHandler_ReturnsPublishedDetailWithStoredCoverUrl` (line 1329)
- Fact: `GetBlogBySlugQueryHandler_ReturnsNull_ForDraftOrMissingSlug` (line 1358)
- Fact: `GetBlogDetailContextQueryHandler_ReturnsBoundedPublicContext_WithAdjacentItems` (line 1374)

#### RealLoadTestRunnerComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/RealLoadTestRunnerComponentTests.cs`
- Declared methods: 4
- Fact: `K6Script_ExportsTrueP99ThresholdsAndNginxUpstreamAlias` (line 12)
- Fact: `K6Script_RecordsTargetPayloadAndReceiveTimingForHeavyDetailAttribution` (line 27)
- Fact: `K6Script_RecordsTargetDbCommandTimingForHeavyDetailAttribution` (line 37)
- Fact: `K6Runner_PersistsRunScopedDiagnosticsWhileProcessIsRunning` (line 48)

#### RequestDatabaseDiagnosticsTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/RequestDatabaseDiagnosticsTests.cs`
- Declared methods: 2
- Fact: `CaptureCurrent_ReturnsZero_WhenNoRequestScopeIsActive` (line 8)
- Fact: `CaptureCurrent_TracksCommandCountAndElapsedInsideRequestScope` (line 20)

#### WorkVideoComponentTests
- File: `backend/tests/WoongBlog.Api.ComponentTests/WorkVideoComponentTests.cs`
- Declared methods: 22
- Fact: `WorkVideoStorageSelector_UsesLocalInTestingUnlessR2IsForced` (line 28)
- Fact: `WorkVideoStorageSelector_UsesR2WhenForcedInTestingAndPlaybackIsAvailable` (line 44)
- Theory: `WorkVideoStorageSelector_FallsBackToLocalWhenR2IsMissingOrUnavailable` (line 60)
- Fact: `WorkVideoStorageSelector_TryGetStorage_IsCaseInsensitive` (line 81)
- Fact: `WorkVideoPlaybackUrlBuilder_ResolvesDirectAndHlsStorageUrls` (line 99)
- Theory: `WorkVideoPlaybackUrlBuilder_ReturnsNullForUnsupportedSources` (line 122)
- Fact: `WorkVideoPlaybackUrlBuilder_BuildStorageObjectUrl_UsesRequestedStorage` (line 138)
- Fact: `LocalVideoStorageService_SaveReadAndDelete_UsesTempMediaRoot` (line 157)
- Fact: `LocalVideoStorageService_SaveOverwritesExistingFileAndDeleteIsIdempotent` (line 203)
- Fact: `LocalVideoStorageService_MissingObjectOperationsAreSafe` (line 233)
- Fact: `LocalVideoStorageService_DeleteManifest_RemovesHlsDirectory` (line 261)
- Fact: `WorkVideoHlsWorkspace_CreatesSeparatedSourceAndOutputPathsAndCleansUpLease` (line 286)
- Fact: `WorkVideoHlsOutputPublisher_StoresArtifactsWithExpectedContentTypesAndKeys` (line 317)
- Fact: `WorkVideoHlsOutputPublisher_StopsOnStorageFailureAndLeavesPreviouslySavedArtifactsVisible` (line 353)
- Fact: `WorkVideoCleanupService_ProcessCleanupJobs_DeletesLocalFileAndMarksJobSucceeded` (line 383)
- Fact: `WorkVideoCleanupService_ProcessCleanupJobs_MarksMissingStorageAsFailed` (line 411)
- Fact: `WorkVideoCleanupService_ProcessCleanupJobs_RetriesFailedDeleteUntilMaxAttempts` (line 426)
- Fact: `WorkVideoCleanupService_ExpireUploadSessions_ExpiresUnconfirmedSessionsAndEnqueuesCleanup` (line 445)
- Fact: `ReorderWorkVideosCommandHandler_RewritesSortOrderDeterministically` (line 492)
- Fact: `DeleteWorkVideoCommandHandler_QueuesCleanupAndCompactsRemainingSortOrder` (line 530)
- Fact: `WorkVideoCleanupStore_EnqueuesHlsManifestCleanupOnceForUnderlyingStorage` (line 566)
- Fact: `WorkVideoCleanupStore_SkipsYouTubeAndMalformedHlsSourceKeys` (line 591)

### contract

#### ProviderContractVerificationTests
- File: `backend/tests/WoongBlog.Api.ContractTests/ProviderContractVerificationTests.cs`
- Declared methods: 1
- Fact: `VerifyProviderContractsFromPactFiles` (line 18)
