# Testing Strategy

TDD-first approach with comprehensive coverage.

> **Status:** To be defined. This document will cover testing philosophy, tools, and requirements.

## Philosophy

- **TDD:** Write tests first, then implementation
- **Bulletproof core:** Task system must be rock-solid
- **Fast feedback:** Tests run in <5 seconds

## Stack

- **Vitest** — Unit + integration tests
- **Playwright** — E2E tests
- **Testing Library** — React component tests

## Coverage Requirements

| Layer | Min Coverage |
|-------|--------------|
| Services (main) | 90% |
| Stores (renderer) | 80% |
| Components | 70% |
| E2E critical paths | 100% |

## To Define

- [ ] Unit test patterns
- [ ] Integration test patterns
- [ ] E2E test patterns
- [ ] Mocking strategy (IPC, database)
- [ ] CI pipeline
- [ ] Test data factories
