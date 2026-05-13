#include "SubsystemWidget.h"
#include "Constants.h"
#include <QString>

SubsystemWidget::SubsystemWidget(QWidget *parent) : QWidget(parent) {
    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(0, 10, 0, 10);
    layout->setAlignment(Qt::AlignCenter);

    for (size_t i = 0; i < SUBSYSTEMS.size(); ++i) {
        auto *btn = new QPushButton(QString::fromStdString(SUBSYSTEMS[i]), this);
        btn->setFixedSize(140, 45);
        btn->setStyleSheet(
            "background-color: #c90202; "
            "border: 2px solid #360101; "
            "border-radius: 22px; "
            "color: white; "
            "font-weight: bold; "
            "font-size: 14px;"
        );

        connect(btn, &QPushButton::clicked, this, [this, i]() { onButtonClicked(i); });

        subsystemButtons.push_back(btn);
        layout->addWidget(btn);
    }

    // Select first button by default
    if (!subsystemButtons.empty()) {
        subsystemButtons[0]->setStyleSheet(
            "background-color: #530000; "
            "border: 2px solid #360101; "
            "border-radius: 22px; "
            "color: white; "
            "font-weight: bold; "
            "font-size: 14px;"
        );
    }
}

void SubsystemWidget::onButtonClicked(int index) {
    for (size_t i = 0; i < subsystemButtons.size(); ++i) {
        if (i == static_cast<size_t>(index)) {
            subsystemButtons[i]->setStyleSheet(
                "background-color: #530000; "
                "border: 2px solid #360101; "
                "border-radius: 22px; "
                "color: white; "
                "font-weight: bold; "
                "font-size: 14px;"
            );
        } else {
            subsystemButtons[i]->setStyleSheet(
                "background-color: #c90202; "
                "border: 2px solid #360101; "
                "border-radius: 22px; "
                "color: white; "
                "font-weight: bold; "
                "font-size: 14px;"
            );
        }
    }
    selectedSubsystem = index;
    emit subsystemChanged(index);
}
