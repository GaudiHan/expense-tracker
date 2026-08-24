package com.expensetracker.dto;

import com.expensetracker.model.Category;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ExpenseDtos {

    public record ExpenseRequest(
            @NotBlank String description,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            @NotNull Category category,
            @NotNull LocalDate spentOn
    ) {}

    public record ExpenseResponse(
            Long id,
            String description,
            BigDecimal amount,
            Category category,
            LocalDate spentOn
    ) {}

    public record CategorySummary(
            Category category,
            BigDecimal total
    ) {}
}
