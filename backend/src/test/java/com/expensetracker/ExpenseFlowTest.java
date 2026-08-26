package com.expensetracker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Covers expense CRUD for an authenticated user, and the cross-user
 * ownership behaviour called out in the README: accessing or modifying
 * another user's expense returns 404 (not 403), so a caller can't tell
 * from the response whether the expense id exists at all.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ExpenseFlowTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String tokenA;
    private String tokenB;

    @BeforeEach
    void registerTwoUsers() throws Exception {
        tokenA = registerAndGetToken("expense-user-a-" + System.nanoTime() + "@example.com");
        tokenB = registerAndGetToken("expense-user-b-" + System.nanoTime() + "@example.com");
    }

    private String registerAndGetToken(String email) throws Exception {
        String body = """
                {"email": "%s", "password": "password123"}
                """.formatted(email);

        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        JsonNode json = objectMapper.readTree(response);
        return json.get("token").asText();
    }

    private String sampleExpense() {
        return """
                {"description": "Coffee", "amount": 4.50, "category": "FOOD", "spentOn": "2026-08-20"}
                """;
    }

    @Test
    void createThenListReturnsTheCreatedExpense() throws Exception {
        mockMvc.perform(post("/api/expenses")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content(sampleExpense()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").value("Coffee"));

        mockMvc.perform(get("/api/expenses")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].description").value("Coffee"));
    }

    @Test
    void createRejectsInvalidAmount() throws Exception {
        String invalid = """
                {"description": "Bad expense", "amount": -5, "category": "FOOD", "spentOn": "2026-08-20"}
                """;

        mockMvc.perform(post("/api/expenses")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content(invalid))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void updatingAnotherUsersExpenseReturns404NotForbidden() throws Exception {
        String createResponse = mockMvc.perform(post("/api/expenses")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content(sampleExpense()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long expenseId = objectMapper.readTree(createResponse).get("id").asLong();

        // User B attempts to update user A's expense — must be 404, not 403,
        // so the response doesn't confirm the expense id exists at all.
        mockMvc.perform(put("/api/expenses/" + expenseId)
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content(sampleExpense()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletingAnotherUsersExpenseReturns404NotForbidden() throws Exception {
        String createResponse = mockMvc.perform(post("/api/expenses")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content(sampleExpense()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long expenseId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(delete("/api/expenses/" + expenseId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletingOwnExpenseSucceeds() throws Exception {
        String createResponse = mockMvc.perform(post("/api/expenses")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content(sampleExpense()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long expenseId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(delete("/api/expenses/" + expenseId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNoContent());
    }
}