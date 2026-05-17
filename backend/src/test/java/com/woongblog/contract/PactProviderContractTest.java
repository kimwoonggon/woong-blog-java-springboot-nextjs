package com.woongblog.contract;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.TestcontainersConfiguration;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@Tag("contract")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class PactProviderContractTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @LocalServerPort
    private int port;

    @Test
    void providerSatisfiesFrontendPactInteractions() throws Exception {
        String baseUrl = System.getenv().getOrDefault("PACT_PROVIDER_BASE_URL", "http://127.0.0.1:" + port);
        List<Path> pactFiles = pactFiles();

        assertThat(pactFiles).isNotEmpty();
        for (Path pactFile : pactFiles) {
            JsonNode pact = objectMapper.readTree(pactFile.toFile());
            for (JsonNode interaction : pact.path("interactions")) {
                verifyInteraction(baseUrl, interaction);
            }
        }
    }

    private void verifyInteraction(String baseUrl, JsonNode interaction) throws Exception {
        JsonNode request = interaction.path("request");
        JsonNode response = interaction.path("response");
        String method = request.path("method").asText();
        URI uri = URI.create(baseUrl + request.path("path").asText() + queryString(request.path("query")));

        HttpRequest httpRequest = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(10))
                .method(method, HttpRequest.BodyPublishers.noBody())
                .build();
        HttpResponse<String> actual = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        assertThat(actual.statusCode())
                .as(interaction.path("description").asText())
                .isEqualTo(response.path("status").asInt());

        JsonNode expectedBody = response.path("body").path("content");
        if (!expectedBody.isMissingNode() && !expectedBody.isNull()) {
            JsonNode actualBody = objectMapper.readTree(actual.body());
            assertJsonShape(expectedBody, actualBody, "$");
        }
    }

    private static String queryString(JsonNode query) {
        if (!query.isObject()) {
            return "";
        }

        List<String> pairs = new ArrayList<>();
        Iterator<Map.Entry<String, JsonNode>> fields = query.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            if (field.getValue().isArray()) {
                for (JsonNode value : field.getValue()) {
                    pairs.add(encode(field.getKey()) + "=" + encode(value.asText()));
                }
            } else {
                pairs.add(encode(field.getKey()) + "=" + encode(field.getValue().asText()));
            }
        }
        return pairs.isEmpty() ? "" : "?" + String.join("&", pairs);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private void assertJsonShape(JsonNode expected, JsonNode actual, String path) {
        if (expected.isObject()) {
            assertThat(actual.isObject()).as(path + " is an object").isTrue();
            Iterator<Map.Entry<String, JsonNode>> fields = expected.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                assertThat(actual.has(field.getKey())).as(path + "." + field.getKey() + " exists").isTrue();
                assertJsonShape(field.getValue(), actual.get(field.getKey()), path + "." + field.getKey());
            }
            return;
        }

        if (expected.isArray()) {
            assertThat(actual.isArray()).as(path + " is an array").isTrue();
            if (!expected.isEmpty()) {
                assertThat(actual).as(path + " has at least one element").isNotEmpty();
                assertJsonShape(expected.get(0), actual.get(0), path + "[0]");
            }
            return;
        }

        if (expected.isTextual()) {
            assertThat(actual.isTextual()).as(path + " is text").isTrue();
        } else if (expected.isNumber()) {
            assertThat(actual.isNumber()).as(path + " is numeric").isTrue();
        } else if (expected.isBoolean()) {
            assertThat(actual.isBoolean()).as(path + " is boolean").isTrue();
        }
    }

    private List<Path> pactFiles() throws IOException {
        Path pactDirectory = pactDirectory();
        try (var stream = Files.list(pactDirectory)) {
            return stream
                    .filter(path -> path.getFileName().toString().endsWith(".json"))
                    .sorted()
                    .toList();
        }
    }

    private static Path pactDirectory() {
        String configured = System.getenv("PACT_FILE_DIRECTORY");
        if (configured != null && !configured.isBlank()) {
            return Path.of(configured);
        }
        Path current = Path.of("").toAbsolutePath();
        Path fromRepoRoot = current.resolve("tests/contracts/pacts");
        if (Files.exists(fromRepoRoot)) {
            return fromRepoRoot;
        }
        return current.resolve("../tests/contracts/pacts").normalize();
    }
}
