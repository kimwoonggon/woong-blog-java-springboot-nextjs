package com.woongblog.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

@Tag("unit")
class ApiExceptionHandlerTest {
    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void notFoundReturnsNotFoundStatusAndMessage() {
        ResponseEntity<Map<String, String>> response = handler.notFound(new NotFoundException("Missing item."));

        assertError(response, HttpStatus.NOT_FOUND, "Missing item.");
    }

    @Test
    void conflictReturnsConflictStatusAndMessage() {
        ResponseEntity<Map<String, String>> response = handler.conflict(new ConflictException("Already exists."));

        assertError(response, HttpStatus.CONFLICT, "Already exists.");
    }

    @Test
    void badRequestReturnsBadRequestStatusAndMessage() {
        ResponseEntity<Map<String, String>> response = handler.badRequest(new BadRequestException("Invalid input."));

        assertError(response, HttpStatus.BAD_REQUEST, "Invalid input.");
    }

    @Test
    void duplicateReturnsStableConflictMessage() {
        ResponseEntity<Map<String, String>> response = handler.duplicate();

        assertError(response, HttpStatus.CONFLICT, "A record with the same key already exists.");
    }

    @Test
    void validationUsesFirstFieldErrorMessage() throws Exception {
        BindingResult bindingResult = new BeanPropertyBindingResult(new ValidationPayload(null), "payload");
        bindingResult.addError(new FieldError("payload", "name", "Name is required."));

        ResponseEntity<Map<String, String>> response = handler.validation(validationException(bindingResult));

        assertError(response, HttpStatus.BAD_REQUEST, "Name is required.");
    }

    @Test
    void validationFallsBackWhenNoFieldErrorsExist() throws Exception {
        BindingResult bindingResult = new BeanPropertyBindingResult(new ValidationPayload(null), "payload");

        ResponseEntity<Map<String, String>> response = handler.validation(validationException(bindingResult));

        assertError(response, HttpStatus.BAD_REQUEST, "Request validation failed.");
    }

    private static void assertError(
            ResponseEntity<Map<String, String>> response,
            HttpStatus expectedStatus,
            String expectedMessage) {
        assertThat(response.getStatusCode()).isEqualTo(expectedStatus);
        assertThat(response.getBody()).containsEntry("error", expectedMessage);
    }

    private static MethodArgumentNotValidException validationException(BindingResult bindingResult) throws Exception {
        Method method = ApiExceptionHandlerTest.class.getDeclaredMethod("validatedEndpoint", ValidationPayload.class);
        return new MethodArgumentNotValidException(new MethodParameter(method, 0), bindingResult);
    }

    @SuppressWarnings("unused")
    private void validatedEndpoint(ValidationPayload payload) {
    }

    private record ValidationPayload(String name) {
    }
}
