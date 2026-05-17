package com.woongblog;

import static org.mockito.Mockito.mockStatic;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.boot.SpringApplication;

@Tag("unit")
class BackendApplicationTest {
    @Test
    void mainDelegatesToSpringApplicationRun() {
        String[] args = {"--spring.main.web-application-type=none"};

        try (MockedStatic<SpringApplication> springApplication = mockStatic(SpringApplication.class)) {
            BackendApplication.main(args);

            springApplication.verify(() -> SpringApplication.run(BackendApplication.class, args));
        }
    }
}
