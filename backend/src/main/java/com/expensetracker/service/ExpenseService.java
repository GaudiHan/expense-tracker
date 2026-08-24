package com.expensetracker.service;

import com.expensetracker.dto.ExpenseDtos.CategorySummary;
import com.expensetracker.dto.ExpenseDtos.ExpenseRequest;
import com.expensetracker.dto.ExpenseDtos.ExpenseResponse;
import com.expensetracker.model.Category;
import com.expensetracker.model.Expense;
import com.expensetracker.repository.ExpenseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;

    public ExpenseService(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    public List<ExpenseResponse> listForUser(Long userId) {
        return expenseRepository.findByUserIdOrderBySpentOnDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public ExpenseResponse create(Long userId, ExpenseRequest request) {
        Expense expense = new Expense();
        expense.setUserId(userId);
        expense.setDescription(request.description());
        expense.setAmount(request.amount());
        expense.setCategory(request.category());
        expense.setSpentOn(request.spentOn());

        return toResponse(expenseRepository.save(expense));
    }

    public ExpenseResponse update(Long userId, Long expenseId, ExpenseRequest request) {
        Expense expense = requireOwned(userId, expenseId);
        expense.setDescription(request.description());
        expense.setAmount(request.amount());
        expense.setCategory(request.category());
        expense.setSpentOn(request.spentOn());

        return toResponse(expenseRepository.save(expense));
    }

    public void delete(Long userId, Long expenseId) {
        Expense expense = requireOwned(userId, expenseId);
        expenseRepository.delete(expense);
    }

    public List<CategorySummary> categorySummary(Long userId) {
        Map<Category, BigDecimal> totals = expenseRepository.findByUserIdOrderBySpentOnDesc(userId).stream()
                .collect(Collectors.groupingBy(
                        Expense::getCategory,
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
                ));

        return totals.entrySet().stream()
                .map(e -> new CategorySummary(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(CategorySummary::total).reversed())
                .toList();
    }

    // Returns the expense only if it belongs to the given user; otherwise 404
    // (not 403) so we don't leak whether a given expense id exists at all.
    private Expense requireOwned(Long userId, Long expenseId) {
        Expense expense = expenseRepository.findByIdAndUserId(expenseId, userId);
        if (expense == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found");
        }
        return expense;
    }

    private ExpenseResponse toResponse(Expense expense) {
        return new ExpenseResponse(
                expense.getId(),
                expense.getDescription(),
                expense.getAmount(),
                expense.getCategory(),
                expense.getSpentOn()
        );
    }
}
