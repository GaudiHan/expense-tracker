package com.expensetracker.controller;

import com.expensetracker.dto.ExpenseDtos.CategorySummary;
import com.expensetracker.security.CurrentUser;
import com.expensetracker.service.ExpenseService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/summary")
public class SummaryController {

    private final ExpenseService expenseService;

    public SummaryController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @GetMapping("/by-category")
    public List<CategorySummary> byCategory() {
        return expenseService.categorySummary(CurrentUser.id());
    }
}
