package com.woongblog.identity;

import java.util.UUID;

public record AppPrincipal(UUID profileId, String email, String displayName, String role) {
}
