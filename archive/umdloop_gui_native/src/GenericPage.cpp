#include "GenericPage.h"
#include "Constants.h"
#include <QVBoxLayout>
#include <QString>

GenericPage::GenericPage(const std::string &mode, int subsystem, QWidget *parent)
    : QWidget(parent), modeName(mode), currentSubsystem(subsystem) {

    auto *layout = new QVBoxLayout(this);
    layout->setAlignment(Qt::AlignCenter);

    titleLabel = new QLabel(this);
    titleLabel->setStyleSheet("font-size: 24px; font-weight: bold;");
    titleLabel->setAlignment(Qt::AlignCenter);
    layout->addWidget(titleLabel);

    updateTitle();
}

void GenericPage::updateSubsystem(int subsystem) {
    currentSubsystem = subsystem;
    updateTitle();
}

void GenericPage::updateTitle() {
    titleLabel->setText(
        QString::fromStdString(SUBSYSTEMS[currentSubsystem] + " - " + modeName)
    );
}
